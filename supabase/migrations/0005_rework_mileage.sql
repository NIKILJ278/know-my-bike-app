-- ============================================================
-- Weighted average mileage (applied to the live DB via Supabase MCP).
--
-- The database already recalculated per-fill km/l using the full-to-full
-- method (partial fills counted) via trg_fuel_stats_after_change. This
-- migration only changes how bikes.avg_mileage is derived: total distance
-- divided by total litres across all full-to-full segments, instead of a
-- plain mean of per-fill figures. It also guards against zero/negative
-- distance and breaks odometer ties by created_at.
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
  tot_dist numeric := 0;
  tot_litres numeric := 0;
begin
  -- Full-to-full: walk fills in odometer order, accumulate litres (partials
  -- included) and close a segment on each full-tank fill.
  for r in
    select id, litres, odometer_km, full_tank
    from public.fuel_logs
    where bike_id = target_bike_id
    order by odometer_km asc, created_at asc
  loop
    accumulated_litres := accumulated_litres + coalesce(r.litres, 0);
    seg_mileage := null;

    if r.full_tank then
      if has_anchor and r.odometer_km > prev_odometer and accumulated_litres > 0 then
        seg_mileage := round((r.odometer_km - prev_odometer) / accumulated_litres, 2);
        tot_dist := tot_dist + (r.odometer_km - prev_odometer);
        tot_litres := tot_litres + accumulated_litres;
      end if;
      prev_odometer := r.odometer_km;
      accumulated_litres := 0;
      has_anchor := true;
    end if;

    update public.fuel_logs set mileage = seg_mileage
      where id = r.id and mileage is distinct from seg_mileage;
  end loop;

  -- Bike average = total distance / total litres (weighted), not a plain
  -- mean of per-fill figures.
  update public.bikes b
    set odometer_km = greatest(
          coalesce(b.odometer_km, 0),
          coalesce((select max(odometer_km) from public.fuel_logs where bike_id = target_bike_id), 0)
        ),
        avg_mileage = case when tot_litres > 0 then round(tot_dist / tot_litres, 2) else null end
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
