-- Message attachments: photos, videos, PDFs, and Office documents, up to 10
-- files of 50 MB each per message.
--
-- The browser uploads each file to the private `attachments` bucket at
-- `<family id>/<random uuid>`. Uploading alone shows the file to no one else:
-- only start_conversation or send_message, run as the uploader, links it to a
-- message in that family, taking its size and type from storage, never from
-- the client. Files and attachment rows are append-only court records, like
-- the messages they belong to. Storage has no update or delete policy, so
-- clients can never change or remove a file.
--
-- A message now needs visible text, attachments, or both.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
    'video/mp4', 'video/quicktime', 'video/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
);

-- True when an object name is `<family uuid>/<uuid>` for a family the caller
-- belongs to. The shape is checked before the cast, so a malformed name is
-- refused rather than raising an error.
create function private.is_member_attachment_path(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when object_name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then private.is_family_member(split_part(object_name, '/', 1)::uuid)
    else false
  end;
$$;

revoke execute on function private.is_member_attachment_path(text) from public;
grant execute on function private.is_member_attachment_path(text) to authenticated;

create policy "Family members can upload attachments"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'attachments' and private.is_member_attachment_path(name));

create policy "Family members can read attachments"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'attachments' and private.is_member_attachment_path(name));

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete restrict,
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  position smallint not null check (position between 0 and 9),
  created_at timestamptz not null default now(),
  unique (message_id, position)
);

alter table public.message_attachments enable row level security;

create policy "Members can read their families' attachments"
  on public.message_attachments for select
  to authenticated
  using (
    exists (
      select 1
      from public.messages m
      where m.id = message_id
        and private.is_family_member(m.family_id)
    )
  );

revoke all on public.message_attachments from anon, authenticated;
grant select on public.message_attachments to authenticated;

create trigger message_attachments_append_only
  before update or delete on public.message_attachments
  for each row execute function private.reject_append_only_change();
create trigger message_attachments_no_truncate
  before truncate on public.message_attachments
  for each statement execute function private.reject_append_only_change();

-- The body may now be empty when the message has attachments; the functions
-- below check that it has one or the other.
alter table public.messages drop constraint messages_body_check;
alter table public.messages drop constraint messages_body_visible;
alter table public.messages add constraint messages_body_check
  check (
    body = btrim(body, E' \t\r\n')
    and char_length(body) <= 10000
    and (body = '' or private.has_visible_text(body))
  );

-- Links the caller's uploaded files to a new message, in order. Each path must
-- be an object the caller uploaded to the attachments bucket under the
-- message's family, of an allowed type and size, and not attached already.
-- Raises invalid_attachments otherwise.
create function private.attach_files(
  new_message uuid,
  message_family uuid,
  caller uuid,
  attachments jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  item_position bigint;
  item_path text;
  item_name text;
  object_type text;
  object_size bigint;
begin
  if coalesce(jsonb_typeof(attachments), '') <> 'array' then
    raise exception 'invalid_attachments';
  end if;
  if jsonb_array_length(attachments) > 10 then
    raise exception 'invalid_attachments';
  end if;
  if (select count(distinct value->>'path') from jsonb_array_elements(attachments))
    <> jsonb_array_length(attachments) then
    raise exception 'invalid_attachments';
  end if;

  for item, item_position in
    select value, ordinality - 1 from jsonb_array_elements(attachments) with ordinality
  loop
    item_path := item->>'path';
    item_name := btrim(coalesce(item->>'name', ''));
    if item_path is null or char_length(item_name) not between 1 and 255 then
      raise exception 'invalid_attachments';
    end if;

    select o.metadata->>'mimetype', (o.metadata->>'size')::bigint
    into object_type, object_size
    from storage.objects o
    where o.bucket_id = 'attachments'
      and o.name = item_path
      and o.owner_id = caller::text
      and split_part(o.name, '/', 1) = message_family::text;

    if object_type is null
      or object_type not in (
        'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
        'video/mp4', 'video/quicktime', 'video/webm',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      )
      or object_size is null
      or object_size not between 1 and 52428800
      or exists (select 1 from public.message_attachments where storage_path = item_path) then
      raise exception 'invalid_attachments';
    end if;

    insert into public.message_attachments
      (message_id, storage_path, file_name, mime_type, size_bytes, position)
    values (new_message, item_path, item_name, object_type, object_size, item_position);
  end loop;
end;
$$;

revoke execute on function private.attach_files(uuid, uuid, uuid, jsonb) from public;

drop function public.start_conversation(uuid, text, text);
drop function public.send_message(uuid, text);

-- Starts a conversation with its first message and its attachments, in one
-- transaction.
create function public.start_conversation(
  target_family_id uuid,
  conversation_subject text,
  message_body text,
  attachments jsonb default '[]'::jsonb
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
  file_count int := case when jsonb_typeof(attachments) = 'array' then jsonb_array_length(attachments) else 0 end;
  new_conversation uuid;
  new_message uuid;
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
  if char_length(clean_body) > 10000
    or (clean_body <> '' and not private.has_visible_text(clean_body))
    or (clean_body = '' and file_count = 0) then
    raise exception 'invalid_body';
  end if;

  insert into public.conversations (family_id, subject, started_by)
  values (target_family_id, clean_subject, caller)
  returning id into new_conversation;

  insert into public.messages (family_id, conversation_id, sender_id, body)
  values (target_family_id, new_conversation, caller, clean_body)
  returning id into new_message;

  perform private.attach_files(new_message, target_family_id, caller, attachments);

  return new_conversation;
end;
$$;

-- Appends a message with its attachments, and records it as the caller's
-- reply (with delivered, if missing) to every earlier message from the other
-- parent in the conversation that they hadn't replied to yet. The family
-- comes from the conversation; a missing conversation and one in another
-- family look the same to the caller.
create function public.send_message(
  target_conversation_id uuid,
  message_body text,
  attachments jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  clean_body text := btrim(coalesce(message_body, ''), E' \t\r\n');
  file_count int := case when jsonb_typeof(attachments) = 'array' then jsonb_array_length(attachments) else 0 end;
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
  if char_length(clean_body) > 10000
    or (clean_body <> '' and not private.has_visible_text(clean_body))
    or (clean_body = '' and file_count = 0) then
    raise exception 'invalid_body';
  end if;

  insert into public.messages (family_id, conversation_id, sender_id, body)
  values (conversation_family, target_conversation_id, caller, clean_body)
  returning id into new_message;

  perform private.attach_files(new_message, conversation_family, caller, attachments);

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

revoke execute on function public.start_conversation(uuid, text, text, jsonb) from public, anon;
revoke execute on function public.send_message(uuid, text, jsonb) from public, anon;
grant execute on function public.start_conversation(uuid, text, text, jsonb) to authenticated;
grant execute on function public.send_message(uuid, text, jsonb) to authenticated;

-- The list shows "Attachment" for a latest message with no text.
create or replace view public.conversation_previews
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
  latest.created_at as latest_created_at,
  (
    select count(*)::int
    from public.message_attachments a
    where a.message_id = latest.id
  ) as latest_attachment_count
from public.conversations c
left join lateral (
  select m.id, m.sender_id, m.body, m.created_at
  from public.messages m
  where m.conversation_id = c.id
  order by m.seq desc
  limit 1
) latest on true;
