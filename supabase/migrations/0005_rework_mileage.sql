-- ============================================================
-- Bike mileage = whole fuel log, full tank or not (applied to live DB).
-- avg_mileage = (latest odometer - first fill odometer)
--               / (all litres - litres of the first fill)
-- Per-fill km/l in the logbook stays full-to-full (partials counted).
-- Recalculates on insert/edit/delete via trg_fuel_stats_after_change.
-- ============================================================

create or replace function public.recompute_bike_fuel_stats(target_bike_id uuid)
returns void
language plpgsql
security definer
as $function$
declare
  r record;
  prev_odometer numeric;
  accumulated_litres numeric := 0;
  has_anchor boolean := false;
  seg_mileage numeric;
  first_odometer numeric;
  first_litres numeric := 0;
  last_odometer numeric;
  sum_litres numeric := 0;
  overall numeric := null;
begin
  for r in
    select id, litres, odometer_km, full_tank
    from public.fuel_logs
    where bike_id = target_bike_id
    order by odometer_km asc, created_at asc
  loop
    -- Whole-log totals: every fill counts, full tank or not.
    if first_odometer is null then
      first_odometer := r.odometer_km;
      first_litres := coalesce(r.litres, 0);
    end if;
    last_odometer := r.odometer_km;
    sum_litres := sum_litres + coalesce(r.litres, 0);

    -- Per-fill figure stays full-to-full (partials included in the litres).
    accumulated_litres := accumulated_litres + coalesce(r.litres, 0);
    seg_mileage := null;
    if r.full_tank then
      if has_anchor and r.odometer_km > prev_odometer and accumulated_litres > 0 then
        seg_mileage := round((r.odometer_km - prev_odometer) / accumulated_litres, 2);
      end if;
      prev_odometer := r.odometer_km;
      accumulated_litres := 0;
      has_anchor := true;
    end if;

    update public.fuel_logs set mileage = seg_mileage
      where id = r.id and mileage is distinct from seg_mileage;
  end loop;

  -- Bike mileage = total distance between first and latest fill divided by
  -- all litres added after the first fill (the first fill's fuel was burned
  -- before the first reading).
  if first_odometer is not null
     and last_odometer > first_odometer
     and (sum_litres - first_litres) > 0 then
    overall := round((last_odometer - first_odometer) / (sum_litres - first_litres), 2);
  end if;

  update public.bikes b
    set odometer_km = greatest(coalesce(b.odometer_km, 0), coalesce(last_odometer, 0)),
        avg_mileage = overall
  where b.id = target_bike_id;
end;
$function$;

do $$
declare b record;
begin
  for b in select distinct bike_id from public.fuel_logs loop
    perform public.recompute_bike_fuel_stats(b.bike_id);
  end loop;
end $$;
