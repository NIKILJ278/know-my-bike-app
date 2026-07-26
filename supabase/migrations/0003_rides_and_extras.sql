-- ============================================================
-- v2.3 — Rides (group rides + live "let's connect" voice),
-- monthly budget, geotagged trips, phone/invite-code lookup.
-- Run this once in Supabase SQL Editor.
-- ============================================================

-- 1. Extend profiles with phone + a short shareable invite code -------
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists invite_code text unique;

create or replace function public.gen_invite_code()
returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
  i int;
begin
  for i in 1..6 loop
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return code;
end;
$$ language plpgsql;

update public.profiles set invite_code = public.gen_invite_code() where invite_code is null;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, email, invite_code)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), new.email, public.gen_invite_code())
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Privacy-safe lookup: returns only id/username/invite_code for a phone
-- or invite-code match, without opening up full profile SELECT to
-- everyone (profiles stay owner-only otherwise).
create or replace function public.find_profile_for_invite(query text)
returns table(id uuid, username text, invite_code text) as $$
  select id, username, invite_code from public.profiles
    where phone = query or invite_code = upper(query)
    limit 1;
$$ language sql security definer;

grant execute on function public.find_profile_for_invite(text) to authenticated;

-- 2. Monthly budget on bikes -------------------------------------------
alter table public.bikes add column if not exists monthly_budget numeric;

-- 3. Geotagged trips -----------------------------------------------------
alter table public.trips add column if not exists start_lat numeric;
alter table public.trips add column if not exists start_lng numeric;
alter table public.trips add column if not exists end_lat numeric;
alter table public.trips add column if not exists end_lng numeric;

-- 4. RIDES ----------------------------------------------------------------
create table if not exists public.rides (
  id uuid primary key default gen_random_uuid(),
  host_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'Group Ride',
  status text not null default 'planning' check (status in ('planning','active','ended')),
  created_at timestamptz default now()
);

alter table public.rides enable row level security;

create table if not exists public.ride_members (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid references public.rides(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  username text,
  status text not null default 'invited' check (status in ('invited','joined','declined')),
  created_at timestamptz default now(),
  unique (ride_id, user_id)
);

alter table public.ride_members enable row level security;

create table if not exists public.ride_stops (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid references public.rides(id) on delete cascade not null,
  label text not null,
  lat numeric not null,
  lng numeric not null,
  order_index integer not null default 0,
  added_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table public.ride_stops enable row level security;

-- Visibility: a ride is visible to its host and to anyone listed as a
-- member. The self-referencing subquery on ride_members is a standard,
-- non-recursive Postgres RLS pattern (bounded by the user_id=auth.uid()
-- branch), not literal recursion.
drop policy if exists "Rides visible to host and members" on public.rides;
create policy "Rides visible to host and members" on public.rides
  for select using (
    host_id = auth.uid()
    or id in (select ride_id from public.ride_members where user_id = auth.uid())
  );
drop policy if exists "Rides manageable by host" on public.rides;
create policy "Rides manageable by host" on public.rides
  for all using (host_id = auth.uid()) with check (host_id = auth.uid());
drop policy if exists "Members can update their own ride's status transitions" on public.rides;
create policy "Members can update their own ride's status transitions" on public.rides
  for update using (id in (select ride_id from public.ride_members where user_id = auth.uid()));

drop policy if exists "Ride members can view membership for their rides" on public.ride_members;
create policy "Ride members can view membership for their rides" on public.ride_members
  for select using (
    user_id = auth.uid()
    or ride_id in (select ride_id from public.ride_members where user_id = auth.uid())
    or ride_id in (select id from public.rides where host_id = auth.uid())
  );
drop policy if exists "Host can add/manage members" on public.ride_members;
create policy "Host can add/manage members" on public.ride_members
  for all using (
    ride_id in (select id from public.rides where host_id = auth.uid())
  ) with check (
    ride_id in (select id from public.rides where host_id = auth.uid())
  );
drop policy if exists "Invited users can update their own membership (accept/decline)" on public.ride_members;
create policy "Invited users can update their own membership (accept/decline)" on public.ride_members
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Ride stops visible to ride members" on public.ride_stops;
create policy "Ride stops visible to ride members" on public.ride_stops
  for select using (
    ride_id in (select ride_id from public.ride_members where user_id = auth.uid())
    or ride_id in (select id from public.rides where host_id = auth.uid())
  );
drop policy if exists "Ride members can add/manage stops" on public.ride_stops;
create policy "Ride members can add/manage stops" on public.ride_stops
  for all using (
    ride_id in (select ride_id from public.ride_members where user_id = auth.uid() and status = 'joined')
    or ride_id in (select id from public.rides where host_id = auth.uid())
  ) with check (
    ride_id in (select ride_id from public.ride_members where user_id = auth.uid() and status = 'joined')
    or ride_id in (select id from public.rides where host_id = auth.uid())
  );

alter publication supabase_realtime add table public.rides, public.ride_members, public.ride_stops;
