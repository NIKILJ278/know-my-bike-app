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
