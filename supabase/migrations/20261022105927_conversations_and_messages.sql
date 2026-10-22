-- Conversations, messages, and message milestones. All three are append-only
-- court records: clients only read (through family membership), every write
-- goes through the functions below, which take the actor from auth.uid(), and
-- triggers reject any update, delete, or truncate, whatever the role.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete restrict,
  subject text not null
    check (subject = btrim(subject) and char_length(subject) between 1 and 150),
  started_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index conversations_family_id_created_at_idx
  on public.conversations (family_id, created_at desc);

-- `seq` orders messages; created_at (the transaction time) can tie.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity unique,
  family_id uuid not null references public.families (id) on delete restrict,
  conversation_id uuid not null references public.conversations (id) on delete restrict,
  sender_id uuid not null references public.profiles (id) on delete restrict,
  body text not null
    check (body = btrim(body, E' \t\r\n') and char_length(body) between 1 and 10000),
  created_at timestamptz not null default now()
);

create index messages_conversation_id_seq_idx on public.messages (conversation_id, seq);
create index messages_family_id_seq_idx on public.messages (family_id, seq);

-- The first time the receiving parent's app received a message, alerted them
-- to it (notified), showed its text in the list (previewed), or opened its
-- conversation (viewed). One row per message, reader, and kind.
create table public.message_receipts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete restrict,
  message_id uuid not null references public.messages (id) on delete restrict,
  reader_id uuid not null references public.profiles (id) on delete restrict,
  kind text not null check (kind in ('received', 'notified', 'previewed', 'viewed')),
  created_at timestamptz not null default now(),
  unique (message_id, reader_id, kind)
);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_receipts enable row level security;

create policy "Members can read their families' conversations"
  on public.conversations for select
  to authenticated
  using (private.is_family_member(family_id));

create policy "Members can read their families' messages"
  on public.messages for select
  to authenticated
  using (private.is_family_member(family_id));

create policy "Members can read their families' message receipts"
  on public.message_receipts for select
  to authenticated
  using (private.is_family_member(family_id));

revoke all on public.conversations from anon, authenticated;
revoke all on public.messages from anon, authenticated;
revoke all on public.message_receipts from anon, authenticated;
grant select on public.conversations to authenticated;
grant select on public.messages to authenticated;
grant select on public.message_receipts to authenticated;

create function private.reject_append_only_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'append_only';
end;
$$;

create trigger conversations_append_only
  before update or delete on public.conversations
  for each row execute function private.reject_append_only_change();
create trigger conversations_no_truncate
  before truncate on public.conversations
  for each statement execute function private.reject_append_only_change();

create trigger messages_append_only
  before update or delete on public.messages
  for each row execute function private.reject_append_only_change();
create trigger messages_no_truncate
  before truncate on public.messages
  for each statement execute function private.reject_append_only_change();

create trigger message_receipts_append_only
  before update or delete on public.message_receipts
  for each row execute function private.reject_append_only_change();
create trigger message_receipts_no_truncate
  before truncate on public.message_receipts
  for each statement execute function private.reject_append_only_change();

-- Starts a conversation with its first message, in one transaction.
create function public.start_conversation(
  target_family_id uuid,
  conversation_subject text,
  message_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  clean_subject text := btrim(coalesce(conversation_subject, ''));
  clean_body text := btrim(coalesce(message_body, ''), E' \t\r\n');
  new_conversation uuid;
begin
  if caller is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (
    select 1 from public.family_members
    where family_id = target_family_id and user_id = caller
  ) then
    raise exception 'not_member';
  end if;
  if char_length(clean_subject) not between 1 and 150 then
    raise exception 'invalid_subject';
  end if;
  if char_length(clean_body) not between 1 and 10000 then
    raise exception 'invalid_body';
  end if;

  insert into public.conversations (family_id, subject, started_by)
  values (target_family_id, clean_subject, caller)
  returning id into new_conversation;

  insert into public.messages (family_id, conversation_id, sender_id, body)
  values (target_family_id, new_conversation, caller, clean_body);

  return new_conversation;
end;
$$;

-- Appends a message. The family comes from the conversation; a missing
-- conversation and one in another family look the same to the caller.
create function public.send_message(target_conversation_id uuid, message_body text)
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

  return new_message;
end;
$$;

-- Records the caller's first milestone of one kind for each message. Only
-- messages in the caller's families that someone else sent count; other ids
-- are ignored. Any later milestone also records `received` if it's missing,
-- with the same time.
create function public.record_message_receipts(receipt_kind text, message_ids uuid[])
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
  if receipt_kind is null or receipt_kind not in ('received', 'notified', 'previewed', 'viewed') then
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
    select 'received' as kind
    union all
    select receipt_kind where receipt_kind <> 'received'
  ) k
  where m.id = any(message_ids)
    and m.sender_id <> caller
  on conflict (message_id, reader_id, kind) do nothing;
end;
$$;

-- The co-parent's messages in one family that the caller hasn't viewed yet,
-- newest first. Runs as the caller, so RLS limits it to their families.
create function public.unread_messages(target_family_id uuid)
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
        and r.kind = 'viewed'
    )
  order by m.seq desc
  limit 500;
$$;

-- Each conversation with its latest message. Runs as the caller, so the base
-- tables' RLS applies.
create view public.conversation_previews
with (security_invoker = true)
as
select
  c.id,
  c.family_id,
  c.subject,
  c.started_by,
  c.created_at,
  latest.id as latest_message_id,
  latest.sender_id as latest_sender_id,
  latest.body as latest_body,
  latest.created_at as latest_created_at
from public.conversations c
left join lateral (
  select m.id, m.sender_id, m.body, m.created_at
  from public.messages m
  where m.conversation_id = c.id
  order by m.seq desc
  limit 1
) latest on true;

revoke all on public.conversation_previews from anon, authenticated;
grant select on public.conversation_previews to authenticated;

revoke execute on function public.start_conversation(uuid, text, text) from public, anon;
revoke execute on function public.send_message(uuid, text) from public, anon;
revoke execute on function public.record_message_receipts(text, uuid[]) from public, anon;
revoke execute on function public.unread_messages(uuid) from public, anon;

grant execute on function public.start_conversation(uuid, text, text) to authenticated;
grant execute on function public.send_message(uuid, text) to authenticated;
grant execute on function public.record_message_receipts(text, uuid[]) to authenticated;
grant execute on function public.unread_messages(uuid) to authenticated;

-- Live updates. Realtime checks each subscriber's RLS before sending a change.
alter publication supabase_realtime
  add table public.conversations, public.messages, public.message_receipts;
