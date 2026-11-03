-- ============================================================
-- Rework mileage (km/l) calculation.
--
-- What was wrong before:
--  * The trigger only ran on INSERT, so editing or deleting a fill
--    (or changing its odometer/litres) never fixed the mileage.
--  * Partial fills between two full tanks were ignored, so litres
--    were under-counted and km/l came out too high.
--  * bikes.avg_mileage was just the LATEST reading, not an average.
--
-- How it works now (standard "full-to-full" method):
--  * Fills are ordered by odometer.
--  * For each full-tank fill, distance = odometer - previous full
--    fill's odometer, litres = this fill + every partial fill since
--    the previous full fill.  mileage = distance / litres.
--  * Partial fills get no mileage of their own.
--  * bikes.avg_mileage = total distance / total litres across all
--    full-to-full segments (a true weighted average).
--  * Recalculated on insert, update and delete.
--
-- Run this once in the Supabase SQL Editor.
-- ============================================================

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
