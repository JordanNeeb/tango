-- Subjects and message bodies must contain at least one visible character.
-- The earlier checks trimmed only ASCII whitespace, so a body made only of a
-- non-breaking space (or other Unicode whitespace) became a blank, permanent
-- message. This treats the same characters as blank that JavaScript's trim()
-- removes, so the app and the database agree.
--
-- Existing rows are checked when the constraints are added; a blank one fails
-- this migration and rolls it back.

create function private.has_visible_text(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value ~ (
    '[^[:space:]'
    || chr(160) || chr(5760) || chr(8192) || '-' || chr(8202)
    || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279)
    || ']'
  );
$$;

revoke execute on function private.has_visible_text(text) from public;

alter table public.conversations add constraint conversations_subject_visible
  check (private.has_visible_text(subject));
alter table public.messages add constraint messages_body_visible
  check (private.has_visible_text(body));

-- Starts a conversation with its first message, in one transaction.
create or replace function public.start_conversation(
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
  if char_length(clean_subject) not between 1 and 150
    or not private.has_visible_text(clean_subject) then
    raise exception 'invalid_subject';
  end if;
  if char_length(clean_body) not between 1 and 10000
    or not private.has_visible_text(clean_body) then
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
  if char_length(clean_body) not between 1 and 10000
    or not private.has_visible_text(clean_body) then
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
