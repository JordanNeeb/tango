-- Message status. The receiving parent's milestones become: delivered (their
-- app first loaded the message), received (an unread alert first showed it),
-- previewed (its text first showed in the list), read (its conversation was
-- first opened), and replied (they first sent a message after it in the same
-- conversation). Sent is the message's own created_at. Replied is recorded by
-- send_message; clients record the others.
--
-- Receipts are append-only, so existing rows can't be renamed. None exist yet
-- (the previous migration shipped no UI that records them); if any did, adding
-- the new check fails and this migration rolls back.

alter table public.message_receipts drop constraint message_receipts_kind_check;
alter table public.message_receipts add constraint message_receipts_kind_check
  check (kind in ('delivered', 'received', 'previewed', 'read', 'replied'));

-- Records the caller's first status of one kind for each message. Only
-- messages in the caller's families that someone else sent count; other ids
-- are ignored. Any later status also records `delivered` if it's missing, with
-- the same time. `replied` comes only from send_message.
create or replace function public.record_message_receipts(receipt_kind text, message_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'not_authenticated';
  end if;
  if receipt_kind is null or receipt_kind not in ('delivered', 'received', 'previewed', 'read') then
    raise exception 'invalid_kind';
  end if;
  if coalesce(cardinality(message_ids), 0) > 500 then
    raise exception 'too_many';
  end if;

  insert into public.message_receipts (family_id, message_id, reader_id, kind)
  select m.family_id, m.id, caller, k.kind
  from public.messages m
  join public.family_members fm on fm.family_id = m.family_id and fm.user_id = caller
  cross join (
    select 'delivered' as kind
    union all
    select receipt_kind where receipt_kind <> 'delivered'
  ) k
  where m.id = any(message_ids)
    and m.sender_id <> caller
  on conflict (message_id, reader_id, kind) do nothing;
end;
$$;

-- Appends a message, and records it as the caller's reply (with delivered, if
-- missing) to every earlier message from the other parent in the conversation
-- that they hadn't replied to yet. The family comes from the conversation; a
-- missing conversation and one in another family look the same to the caller.
create or replace function public.send_message(target_conversation_id uuid, message_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  clean_body text := btrim(coalesce(message_body, ''), E' \t\r\n');
  conversation_family uuid;
  new_message uuid;
begin
  if caller is null then
    raise exception 'not_authenticated';
  end if;

  select c.family_id into conversation_family
  from public.conversations c
  join public.family_members fm on fm.family_id = c.family_id and fm.user_id = caller
  where c.id = target_conversation_id;

  if conversation_family is null then
    raise exception 'not_member';
  end if;
  if char_length(clean_body) not between 1 and 10000 then
    raise exception 'invalid_body';
  end if;

  insert into public.messages (family_id, conversation_id, sender_id, body)
  values (conversation_family, target_conversation_id, caller, clean_body)
  returning id into new_message;

  insert into public.message_receipts (family_id, message_id, reader_id, kind)
  select m.family_id, m.id, caller, k.kind
  from public.messages m
  cross join (values ('delivered'), ('replied')) as k(kind)
  where m.conversation_id = target_conversation_id
    and m.sender_id <> caller
    and m.id <> new_message
  on conflict (message_id, reader_id, kind) do nothing;

  return new_message;
end;
$$;

create or replace function public.unread_messages(target_family_id uuid)
returns table (id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
  select m.id
  from public.messages m
  where m.family_id = target_family_id
    and m.sender_id <> (select auth.uid())
    and not exists (
      select 1
      from public.message_receipts r
      where r.message_id = m.id
        and r.reader_id = (select auth.uid())
        and r.kind = 'read'
    )
  order by m.seq desc
  limit 500;
$$;
