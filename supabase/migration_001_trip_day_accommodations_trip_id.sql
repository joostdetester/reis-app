-- Migratie: voegt trip_id toe aan trip_day_accommodations, consistent met alle
-- andere tabellen (nodig voor de generieke useRealtimeTable-hook, die overal op
-- trip_id filtert). Uitvoeren via de SQL Editor als schema.sql al eerder is gedraaid.

alter table trip_day_accommodations add column trip_id uuid references trips(id) on delete cascade;

update trip_day_accommodations tda
set trip_id = td.trip_id
from trip_days td
where td.id = tda.trip_day_id;

alter table trip_day_accommodations alter column trip_id set not null;
