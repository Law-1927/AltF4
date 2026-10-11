-- ALTF4 — TEST services only. Run once in the Supabase SQL Editor.
--
-- Names, prices and warranty come from the wireframe's SAMPLE screen.
-- Durations for the last two are made-up placeholders. Replace all of this
-- with the client's real service catalog before going live.
--
-- To remove these later:  delete from public.services where name like '[TEST]%';
insert into public.services (name, description, price_php, duration_mins, warranty_years)
values
  ('[TEST] Ceramic Pro (9H)', 'Sample ceramic coating', 45000.00, 240, 5),
  ('[TEST] Standard PMS',     'Sample preventive maintenance', 8500.00, 120, null),
  ('[TEST] Deep Detailing',   'Sample deep detailing', 12000.00, 180, null);
