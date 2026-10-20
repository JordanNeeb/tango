-- Co-parent invites. A parent invites their co-parent by email; the family is
-- created only when the invited parent accepts. Invites expire after 7 days
-- (pending with expires_at in the past; no job flips them). Clients only read
-- their own sent invites; every write goes through the functions below, which
-- take the actor from auth.uid().

create table public.family_invites (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null references public.profiles (id) on delete restrict,
  invited_email text not null check (invited_email = lower(trim(invited_email))),
  time_zone text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  family_id uuid references public.families (id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  last_sent_at timestamptz,
  accepted_at timestamptz
);

create index family_invites_invited_email_idx on public.family_invites (invited_email);
create index family_invites_invited_by_idx on public.family_invites (invited_by);

alter table public.family_invites enable row level security;

create policy "Parents can read the invites they sent"
  on public.family_invites for select
  to authenticated
  using (invited_by = (select auth.uid()));

revoke all on public.family_invites from anon, authenticated;
-- Every column except the token. Following the email link accepts the invite,
-- so only the email function (service role) may read the token; an inviter who
-- could read it could send the invitee's browser to the link from elsewhere.
grant select (
  id, invited_by, invited_email, time_zone, status, family_id,
  created_at, expires_at, last_sent_at, accepted_at
) on public.family_invites to authenticated;

-- Serializes invite creation and acceptance for one pair of emails, so two
-- concurrent requests can't both pass the duplicate checks.
create function private.lock_invite_pair(first_email text, second_email text)
returns void
language sql
security definer
set search_path = ''
as $$
  select pg_advisory_xact_lock(
    hashtextextended(least(first_email, second_email) || ' ' || greatest(first_email, second_email), 0)
  );
$$;

revoke execute on function private.lock_invite_pair(text, text) from public, authenticated;

-- Errors are raised with a stable code as the message; the web maps each code
-- to copy.
create function public.create_family_invite(email text, time_zone text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  caller_email text;
  caller_name text;
  caller_type text;
  target_email text := lower(trim(coalesce(email, '')));
  target_user uuid;
  new_id uuid;
begin
  if caller is null then
    raise exception 'not_authenticated';
  end if;

  select p.name, p.account_type, lower(u.email)
  into caller_name, caller_type, caller_email
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = caller;

  if caller_name is null then
    raise exception 'name_required';
  end if;
  if caller_type = 'professional' then
    raise exception 'not_parent';
  end if;
  if target_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email';
  end if;
  if target_email = caller_email then
    raise exception 'self_invite';
  end if;
  if time_zone is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = time_zone) then
    raise exception 'invalid_time_zone';
  end if;

  -- Each invite emails any address from Tango's domain, so a parent can create
  -- at most 5 in any 24 hours. A per-caller lock keeps concurrent requests from
  -- passing the count together.
  perform pg_advisory_xact_lock(hashtextextended('invite-limit ' || caller::text, 0));
  if (
    select count(*) from public.family_invites i
    where i.invited_by = caller and i.created_at > now() - interval '24 hours'
  ) >= 5 then
    raise exception 'invite_limit';
  end if;

  perform private.lock_invite_pair(caller_email, target_email);

  select u.id into target_user from auth.users u where lower(u.email) = target_email;

  if target_user is not null and exists (
    select 1
    from public.family_members mine
    join public.family_members theirs on theirs.family_id = mine.family_id
    where mine.user_id = caller and theirs.user_id = target_user
  ) then
    raise exception 'already_paired';
  end if;

  if exists (
    select 1
    from public.family_invites i
    where i.status = 'pending'
      and i.expires_at > now()
      and (
        (i.invited_by = caller and i.invited_email = target_email)
        or (i.invited_by = target_user and i.invited_email = caller_email)
      )
  ) then
    raise exception 'pending_exists';
  end if;

  insert into public.family_invites (invited_by, invited_email, time_zone)
  values (caller, target_email, create_family_invite.time_zone)
  returning id into new_id;

  return new_id;
end;
$$;

-- Every invite email goes through this first: it checks the caller sent the
-- invite and limits sending to once a minute per invite.
create function public.mark_family_invite_sent(invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.family_invites;
begin
  select * into invite
  from public.family_invites
  where id = invite_id and invited_by = auth.uid()
  for update;

  if invite.id is null or invite.status <> 'pending' or invite.expires_at <= now() then
    raise exception 'invite_unavailable';
  end if;
  if invite.last_sent_at is not null and invite.last_sent_at > now() - interval '60 seconds' then
    raise exception 'too_soon';
  end if;

  update public.family_invites set last_sent_at = now() where id = invite.id;
end;
$$;

-- Lets the invite link send a signed-out visitor to sign-up with the invited
-- email filled in. The token only identifies the invite; it never authorizes
-- acceptance.
create function public.get_family_invite(invite_token uuid)
returns table (inviter_name text, invited_email text, expired boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p.name, lower(inviter.email)), i.invited_email, i.expires_at <= now()
  from public.family_invites i
  join public.profiles p on p.id = i.invited_by
  join auth.users inviter on inviter.id = i.invited_by
  where i.token = invite_token and i.status = 'pending';
$$;

-- Runs when the invited parent follows the email link (the link is their
-- acceptance), directly or after signing up or in. The caller's confirmed email
-- must match the invite. Creates the family with both parents and closes the
-- invite, all in one transaction with the invite row locked.
create function public.accept_family_invite(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  caller_email text;
  caller_confirmed timestamptz;
  caller_type text;
  inviter_email text;
  invite public.family_invites;
  new_family uuid;
begin
  if caller is null then
    raise exception 'not_authenticated';
  end if;

  select * into invite from public.family_invites where token = invite_token for update;

  if invite.id is null or invite.status <> 'pending' or invite.expires_at <= now() then
    raise exception 'invite_unavailable';
  end if;

  select lower(u.email), u.email_confirmed_at, p.account_type
  into caller_email, caller_confirmed, caller_type
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.id = caller;

  if caller_confirmed is null or caller_email <> invite.invited_email then
    raise exception 'email_mismatch';
  end if;
  if caller_type = 'professional' then
    raise exception 'not_parent';
  end if;
  if caller = invite.invited_by then
    raise exception 'self_invite';
  end if;

  select lower(email) into inviter_email from auth.users where id = invite.invited_by;
  perform private.lock_invite_pair(inviter_email, caller_email);

  if exists (
    select 1
    from public.family_members mine
    join public.family_members theirs on theirs.family_id = mine.family_id
    where mine.user_id = caller and theirs.user_id = invite.invited_by
  ) then
    raise exception 'already_paired';
  end if;

  insert into public.families (time_zone) values (invite.time_zone) returning id into new_family;
  insert into public.family_members (family_id, user_id)
  values (new_family, invite.invited_by), (new_family, caller);

  update public.family_invites
  set status = 'accepted', family_id = new_family, accepted_at = now()
  where id = invite.id;

  return new_family;
end;
$$;

revoke execute on function public.create_family_invite(text, text) from public, anon;
revoke execute on function public.mark_family_invite_sent(uuid) from public, anon;
revoke execute on function public.get_family_invite(uuid) from public;
revoke execute on function public.accept_family_invite(uuid) from public, anon;

grant execute on function public.create_family_invite(text, text) to authenticated;
grant execute on function public.mark_family_invite_sent(uuid) to authenticated;
grant execute on function public.get_family_invite(uuid) to anon, authenticated;
grant execute on function public.accept_family_invite(uuid) to authenticated;
