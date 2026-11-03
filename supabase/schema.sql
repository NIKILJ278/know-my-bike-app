-- ============================================================
-- Know My Bike — complete database schema
-- Run this whole file once in Supabase SQL Editor (Dashboard > SQL Editor).
-- Safe to re-run any time — every statement is idempotent.
-- ============================================================

-- 1. PROFILES ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  email text,
  phone text,
  invite_code text unique,
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

-- Auto-create a profile row (with a fresh invite code) whenever a new
-- auth user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, email, invite_code)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), new.email, public.gen_invite_code())
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill invite codes for any existing profiles that don't have one yet.
update public.profiles set invite_code = public.gen_invite_code() where invite_code is null;

-- Privacy-safe lookup used by the Ride invite flow: returns only
-- id/username/invite_code for an exact phone or invite-code match,
-- without opening up full profile SELECT access to everyone.
create or replace function public.find_profile_for_invite(query text)
returns table(id uuid, username text, invite_code text) as $$
  select id, username, invite_code from public.profiles
    where phone = query or invite_code = upper(query)
    limit 1;
$$ language sql security definer;

grant execute on function public.find_profile_for_invite(text) to authenticated;

-- 2. BIKES --------------------------------------------------------------
create table if not exists public.bikes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  make text,
  photo_url text,
  odometer_km numeric default 0,
  avg_mileage numeric,
  monthly_budget numeric,
  created_at timestamptz default now()
);

alter table public.bikes enable row level security;
drop policy if exists "Bikes are managed by owner" on public.bikes;
create policy "Bikes are managed by owner" on public.bikes
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- 3. FUEL LOGS ------------------------------------------------------------
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

-- Mileage (full-to-full method) — see migrations/0005_rework_mileage.sql
create or replace function public.recompute_bike_mileage(p_bike_id uuid)
returns void as $$
declare
  r record;
  prev_full_odo numeric := null;
  litres_acc numeric := 0;
  seg_mileage numeric;
  tot_dist numeric := 0;
  tot_litres numeric := 0;
  max_odo numeric := null;
begin
  for r in
    select id, litres, odometer_km, full_tank
    from public.fuel_logs
    where bike_id = p_bike_id
    order by odometer_km asc, created_at asc
  loop
    max_odo := r.odometer_km;
    seg_mileage := null;

    if prev_full_odo is not null then
      litres_acc := litres_acc + coalesce(r.litres, 0);
    end if;

    if r.full_tank then
      if prev_full_odo is not null
         and r.odometer_km > prev_full_odo
         and litres_acc > 0 then
        seg_mileage := round((r.odometer_km - prev_full_odo) / litres_acc, 2);
        tot_dist := tot_dist + (r.odometer_km - prev_full_odo);
        tot_litres := tot_litres + litres_acc;
      end if;
      prev_full_odo := r.odometer_km;
      litres_acc := 0;
    end if;

    update public.fuel_logs set mileage = seg_mileage
      where id = r.id and mileage is distinct from seg_mileage;
  end loop;

  update public.bikes
    set odometer_km = greatest(coalesce(odometer_km, 0), coalesce(max_odo, 0)),
        avg_mileage = case when tot_litres > 0 then round(tot_dist / tot_litres, 2) else null end
    where id = p_bike_id;
end;
$$ language plpgsql security definer;

create or replace function public.fuel_logs_recalc_trigger()
returns trigger as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.recompute_bike_mileage(old.bike_id);
  end if;
  if tg_op = 'INSERT' then
    perform public.recompute_bike_mileage(new.bike_id);
  elsif tg_op = 'UPDATE' and new.bike_id is distinct from old.bike_id then
    perform public.recompute_bike_mileage(new.bike_id);
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Old BEFORE INSERT trigger is replaced by AFTER triggers.
drop trigger if exists trg_calc_fuel_mileage on public.fuel_logs;
drop trigger if exists trg_fuel_recalc_ins_del on public.fuel_logs;
drop trigger if exists trg_fuel_recalc_upd on public.fuel_logs;

create trigger trg_fuel_recalc_ins_del
  after insert or delete on public.fuel_logs
  for each row execute procedure public.fuel_logs_recalc_trigger();

-- Column list excludes "mileage", so the recompute's own UPDATEs
-- never re-fire this trigger.
create trigger trg_fuel_recalc_upd
  after update of litres, odometer_km, full_tank, bike_id on public.fuel_logs
  for each row execute procedure public.fuel_logs_recalc_trigger();

-- Backfill: recompute every bike from its existing logs.
do $$
declare b record;
begin
  for b in select distinct bike_id from public.fuel_logs loop
    perform public.recompute_bike_mileage(b.bike_id);
  end loop;
end $$;

-- 4. EXPENSES ---------------------------------------------------------------
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

-- 5. TRIPS --------------------------------------------------------------------
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  bike_id uuid references public.bikes(id) on delete cascade not null,
  title text not null,
  distance_km numeric not null,
  duration_min integer,
  start_place text,
  end_place text,
  start_lat numeric,
  start_lng numeric,
  end_lat numeric,
  end_lng numeric,
  logged_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.trips enable row level security;
drop policy if exists "Trips are managed by bike owner" on public.trips;
create policy "Trips are managed by bike owner" on public.trips
  for all using (exists (select 1 from public.bikes b where b.id = bike_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.bikes b where b.id = bike_id and b.owner_id = auth.uid()));

-- 6. DOCUMENTS (Vault) --------------------------------------------------------
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

-- 7. REMINDERS ------------------------------------------------------------------
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

-- 8. RIDES (group rides + live "Let's Connect" voice) --------------------------
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

-- A policy on ride_members that queries ride_members again inside its own
-- USING clause causes Postgres to detect infinite recursion — this was a
-- real bug: it made any query touching ride_members fail with a 500
-- error (including simply loading your Rides list). Moving the lookup
-- into a SECURITY DEFINER function breaks the cycle, since the function
-- runs as an independent query rather than being inlined into the same
-- row-security check.
create or replace function public.my_ride_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select ride_id from public.ride_members where user_id = auth.uid();
$$;

create or replace function public.my_joined_ride_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select ride_id from public.ride_members where user_id = auth.uid() and status = 'joined';
$$;

grant execute on function public.my_ride_ids() to authenticated;
grant execute on function public.my_joined_ride_ids() to authenticated;

drop policy if exists "Rides visible to host and members" on public.rides;
create policy "Rides visible to host and members" on public.rides
  for select using (
    host_id = auth.uid()
    or id in (select public.my_ride_ids())
  );
drop policy if exists "Rides manageable by host" on public.rides;
create policy "Rides manageable by host" on public.rides
  for all using (host_id = auth.uid()) with check (host_id = auth.uid());
drop policy if exists "Members can update their own ride's status transitions" on public.rides;
create policy "Members can update their own ride's status transitions" on public.rides
  for update using (id in (select public.my_ride_ids()));

drop policy if exists "Ride members can view membership for their rides" on public.ride_members;
create policy "Ride members can view membership for their rides" on public.ride_members
  for select using (
    user_id = auth.uid()
    or ride_id in (select public.my_ride_ids())
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
    ride_id in (select public.my_ride_ids())
    or ride_id in (select id from public.rides where host_id = auth.uid())
  );
drop policy if exists "Ride members can add/manage stops" on public.ride_stops;
create policy "Ride members can add/manage stops" on public.ride_stops
  for all using (
    ride_id in (select public.my_joined_ride_ids())
    or ride_id in (select id from public.rides where host_id = auth.uid())
  ) with check (
    ride_id in (select public.my_joined_ride_ids())
    or ride_id in (select id from public.rides where host_id = auth.uid())
  );

-- 9. REALTIME -------------------------------------------------------------------
-- Enable realtime replication so the app updates live across devices.
-- (Adding a table that's already in the publication throws an error, so
-- this only adds tables that aren't already members.)
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'bikes','fuel_logs','expenses','trips','documents','reminders',
    'rides','ride_members','ride_stops'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end $$;

-- 10. STORAGE (bike photos & document uploads) -----------------------------------
insert into storage.buckets (id, name, public) values ('bike-photos', 'bike-photos', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('vault-files', 'vault-files', false)
  on conflict (id) do nothing;

drop policy if exists "Bike photos are publicly readable" on storage.objects;
create policy "Bike photos are publicly readable" on storage.objects
  for select using (bucket_id = 'bike-photos');
drop policy if exists "Authenticated users can upload bike photos" on storage.objects;
create policy "Authenticated users can upload bike photos" on storage.objects
  for insert with check (bucket_id = 'bike-photos' and auth.role() = 'authenticated');
drop policy if exists "Owners can manage their vault files" on storage.objects;
create policy "Owners can manage their vault files" on storage.objects
  for all using (bucket_id = 'vault-files' and auth.uid()::text = (storage.foldername(name))[1]);
