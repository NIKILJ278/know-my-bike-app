-- Tank capacity (litres), asked when adding a bike and used to sanity-check fuel fills.
alter table public.bikes
  add column if not exists tank_capacity_l numeric
  check (tank_capacity_l is null or (tank_capacity_l > 0 and tank_capacity_l <= 100));
