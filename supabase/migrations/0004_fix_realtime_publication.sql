-- ============================================================
-- Fix: "alter publication supabase_realtime add table ..." is not
-- idempotent, so re-running schema.sql/0003 after rides was already
-- added to the publication threw:
--   ERROR: 42710: relation "rides" is already member of publication
-- and rolled back everything else in that same SQL Editor paste
-- (table creation, RLS policies), which is why the Rides page came
-- back empty. This migration only adds a table to the publication
-- if it isn't already a member, so it can be re-run safely.
-- ============================================================
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
