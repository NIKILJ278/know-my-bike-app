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

create policy "Profiles are viewable by owner" on public.profiles
  for select using (auth.uid() = id);
create policy "Profiles are editable by owner" on public.profiles
  for update using (auth.uid() = id);
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
    select * into prev from public.fuel_logs
      where bike_id = new.bike_id and id <> new.id and odometer_km < new.odometer_km
      order by odometer_km desc limit 1;
    if prev is not null then
      new.mileage := round((new.odometer_km - prev.odometer_km) / nullif(new.litres, 0), 2);
    end if;
  end if;
  update public.bikes set odometer_km = new.odometer_km,
    avg_mileage = coalesce(new.mileage, avg_mileage)
    where id = new.bike_id and odometer_km < new.odometer_km;
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
