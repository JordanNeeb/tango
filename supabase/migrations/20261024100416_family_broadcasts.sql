-- Live messaging updates move from Postgres Changes to Broadcast, Supabase's
-- recommended way to send database changes to clients. Postgres Changes
-- subscribed on staging but delivered no events.
--
-- Each insert in a family's conversations, messages, or message statuses
-- broadcasts a signal on that family's private topic, `family:<family id>`.
-- The signal names only the table; clients refetch what they show through
-- RLS, so no message text travels over Broadcast. Only family members may
-- join the topic, and only the database sends to it.

-- True when `topic` is `family:<uuid>` for a family the caller belongs to.
-- The uuid is checked before the cast, so a malformed topic is refused
-- rather than raising an error.
create function private.can_receive_family_topic(topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select topic ~ '^family:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and private.is_family_member(substr(topic, 8)::uuid);
$$;

revoke execute on function private.can_receive_family_topic(text) from public;
grant execute on function private.can_receive_family_topic(text) to authenticated;

create policy "Family members can receive their family's broadcasts"
  on realtime.messages for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and private.can_receive_family_topic((select realtime.topic()))
  );

-- Runs as its owner so the send works whichever role inserted the row.
create function private.broadcast_family_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object('table', tg_table_name),
    'change',
    'family:' || new.family_id::text,
    true
  );
  return null;
end;
$$;

revoke execute on function private.broadcast_family_change() from public;

create trigger conversations_broadcast
  after insert on public.conversations
  for each row execute function private.broadcast_family_change();

create trigger messages_broadcast
  after insert on public.messages
  for each row execute function private.broadcast_family_change();

create trigger message_receipts_broadcast
  after insert on public.message_receipts
  for each row execute function private.broadcast_family_change();

alter publication supabase_realtime
  drop table public.conversations, public.messages, public.message_receipts;
