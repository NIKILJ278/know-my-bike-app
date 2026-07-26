-- ============================================================
-- Know My Bike — Bike Garage & Expense Tracker
-- Run this whole file once in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. PROFILES ---------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  email text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "Profiles are editable by owner" on public.profiles;
create policy "Profiles are editable by owner" on public.profiles
  for update using (auth.uid() = id);
drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. BIKES --------------------------------------------------------
create table if not exists public.bikes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  make text,
  photo_url text,
  odometer_km numeric default 0,
  avg_mileage numeric,
  created_at timestamptz default now()
);

alter table public.bikes enable row level security;
drop policy if exists "Bikes are managed by owner" on public.bikes;
create policy "Bikes are managed by owner" on public.bikes
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- 3. FUEL LOGS ------------------------------------------------------
create table if not exists public.fuel_logs (
  id uuid primary key default gen_random_uuid(),
  bike_id uuid references public.bikes(id) on delete cascade not null,
  litres numeric not null,
  amount numeric not null,
  odometer_km numeric not null,
  full_tank boolean default true,
  mileage numeric,
  logged_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.fuel_logs enable row level security;
drop policy if exists "Fuel logs are managed by bike owner" on public.fuel_logs;
create policy "Fuel logs are managed by bike owner" on public.fuel_logs
  for all using (exists (select 1 from public.bikes b where b.id = bike_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.bikes b where b.id = bike_id and b.owner_id = auth.uid()));

-- Auto-calculate mileage & keep bike odometer in sync when a full tank is logged
create or replace function public.calc_fuel_mileage()
returns trigger as $$
declare
  prev record;
begin
  if new.full_tank then
    -- Mileage is only meaningful between two full-tank fills.
    select * into prev from public.fuel_logs
      where bike_id = new.bike_id and id <> new.id and full_tank = true and odometer_km < new.odometer_km
      order by odometer_km desc limit 1;
    if prev is not null then
      new.mileage := round((new.odometer_km - prev.odometer_km) / nullif(new.litres, 0), 2);
    end if;
  end if;
  -- Always keep the bike's odometer at the highest known reading and
  -- surface the latest mileage, regardless of the order logs are
  -- inserted in or a manually-entered starting odometer.
  update public.bikes
    set odometer_km = greatest(coalesce(odometer_km, 0), new.odometer_km),
        avg_mileage = coalesce(new.mileage, avg_mileage)
    where id = new.bike_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_calc_fuel_mileage on public.fuel_logs;
create trigger trg_calc_fuel_mileage
  before insert on public.fuel_logs
  for each row execute procedure public.calc_fuel_mileage();

-- 4. EXPENSES ---------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  bike_id uuid references public.bikes(id) on delete cascade not null,
  category text not null check (category in ('Service','Repair','Insurance','Accessories','Other')),
  amount numeric not null,
  note text,
  logged_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.expenses enable row level security;
drop policy if exists "Expenses are managed by bike owner" on public.expenses;
create policy "Expenses are managed by bike owner" on public.expenses
  for all using (exists (select 1 from public.bikes b where b.id = bike_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.bikes b where b.id = bike_id and b.owner_id = auth.uid()));

-- 5. TRIPS --------------------------------------------------------------
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  bike_id uuid references public.bikes(id) on delete cascade not null,
  title text not null,
  distance_km numeric not null,
  duration_min integer,
  start_place text,
  end_place text,
  logged_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.trips enable row level security;
drop policy if exists "Trips are managed by bike owner" on public.trips;
create policy "Trips are managed by bike owner" on public.trips
  for all using (exists (select 1 from public.bikes b where b.id = bike_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.bikes b where b.id = bike_id and b.owner_id = auth.uid()));

-- 6. DOCUMENTS (Vault) ----------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  bike_id uuid references public.bikes(id) on delete cascade not null,
  doc_type text not null check (doc_type in ('Insurance','RC','PUC','License','Other')),
  doc_number text,
  expiry_date date,
  file_url text,
  created_at timestamptz default now()
);

alter table public.documents enable row level security;
drop policy if exists "Documents are managed by bike owner" on public.documents;
create policy "Documents are managed by bike owner" on public.documents
  for all using (exists (select 1 from public.bikes b where b.id = bike_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.bikes b where b.id = bike_id and b.owner_id = auth.uid()));

-- 7. REMINDERS ------------------------------------------------------------
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  bike_id uuid references public.bikes(id) on delete cascade not null,
  title text not null,
  due_date date,
  due_km numeric,
  done boolean default false,
  created_at timestamptz default now()
);

alter table public.reminders enable row level security;
drop policy if exists "Reminders are managed by bike owner" on public.reminders;
create policy "Reminders are managed by bike owner" on public.reminders
  for all using (exists (select 1 from public.bikes b where b.id = bike_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.bikes b where b.id = bike_id and b.owner_id = auth.uid()));

-- 8. REALTIME -----------------------------------------------------------
-- Enable realtime replication so the app updates live across devices.
alter publication supabase_realtime add table public.bikes, public.fuel_logs, public.expenses, public.trips, public.documents, public.reminders;

-- 9. STORAGE (optional, for bike photos & document uploads) -------------
insert into storage.buckets (id, name, public) values ('bike-photos', 'bike-photos', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('vault-files', 'vault-files', false)
  on conflict (id) do nothing;

create policy "Bike photos are publicly readable" on storage.objects
  for select using (bucket_id = 'bike-photos');
create policy "Authenticated users can upload bike photos" on storage.objects
  for insert with check (bucket_id = 'bike-photos' and auth.role() = 'authenticated');
create policy "Owners can manage their vault files" on storage.objects
  for all using (bucket_id = 'vault-files' and auth.uid()::text = (storage.foldername(name))[1]);
-- ============================================================
-- Fix: avg_mileage on bikes never updated when a fuel log's
-- odometer reading was lower than the bike's manually-entered
-- initial odometer (e.g. bike added with odometer_km = 691, then
-- earlier fuel logs at 0/310/500 km never triggered the update
-- because of the `odometer_km < new.odometer_km` guard on the
-- bikes UPDATE). This also switches the "previous fill" lookup to
-- only compare against other full-tank fills, which is the
-- correct way to compute km/l.
-- Run this once in Supabase SQL Editor.
-- ============================================================

create or replace function public.calc_fuel_mileage()
returns trigger as $$
declare
  prev record;
begin
  if new.full_tank then
    select * into prev from public.fuel_logs
      where bike_id = new.bike_id
        and id <> new.id
        and full_tank = true
        and odometer_km < new.odometer_km
      order by odometer_km desc limit 1;
    if prev is not null then
      new.mileage := round((new.odometer_km - prev.odometer_km) / nullif(new.litres, 0), 2);
    end if;
  end if;

  -- Always keep the bike's odometer at the highest known reading,
  -- and always surface the most recent mileage figure — regardless
  -- of insertion order or a manually-entered starting odometer.
  update public.bikes
    set odometer_km = greatest(coalesce(odometer_km, 0), new.odometer_km),
        avg_mileage = coalesce(new.mileage, avg_mileage)
    where id = new.bike_id;

  return new;
end;
$$ language plpgsql security definer;

-- Recompute mileage for any fuel logs that were inserted before this
-- fix and never got a mileage value, then resync each bike's
-- avg_mileage/odometer from its logs.
do $$
declare
  r record;
  prev record;
begin
  for r in select * from public.fuel_logs where full_tank = true order by bike_id, odometer_km asc loop
    select * into prev from public.fuel_logs
      where bike_id = r.bike_id and id <> r.id and full_tank = true and odometer_km < r.odometer_km
      order by odometer_km desc limit 1;
    if prev is not null then
      update public.fuel_logs
        set mileage = round((r.odometer_km - prev.odometer_km) / nullif(r.litres, 0), 2)
        where id = r.id;
    end if;
  end loop;

  for r in select distinct bike_id from public.fuel_logs loop
    update public.bikes b
      set odometer_km = greatest(coalesce(b.odometer_km, 0), (select max(odometer_km) from public.fuel_logs where bike_id = r.bike_id)),
          avg_mileage = coalesce((select mileage from public.fuel_logs where bike_id = r.bike_id and mileage is not null order by odometer_km desc limit 1), b.avg_mileage)
      where b.id = r.bike_id;
  end loop;
end $$;

-- ============================================================
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
