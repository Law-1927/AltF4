-- A completed appointment keeps its original reserved interval. Only
-- cancelled or deleted appointments release a slot.
create or replace function public.sync_booked_slot() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    if tg_op = 'DELETE' then
        delete from public.booked_slots where appointment_id = old.id;
        return null;
    end if;

    if tg_op = 'UPDATE'
       and (new.status = 'Cancelled' or new.id is distinct from old.id) then
        delete from public.booked_slots where appointment_id = old.id;
    end if;

    if new.status <> 'Cancelled' then
        insert into public.booked_slots (appointment_id, starts_at, ends_at)
        values (new.id, new.starts_at, new.ends_at)
        on conflict (appointment_id) do update
        set starts_at = excluded.starts_at,
            ends_at = excluded.ends_at;
    end if;

    return null;
end;
$$;

drop trigger if exists appointments_sync_slot on public.appointments;
create trigger appointments_sync_slot
    after insert or update or delete on public.appointments
    for each row execute function public.sync_booked_slot();

delete from public.booked_slots slot
where not exists (
    select 1
    from public.appointments appointment
    where appointment.id = slot.appointment_id
      and appointment.status <> 'Cancelled'
);

insert into public.booked_slots (appointment_id, starts_at, ends_at)
select id, starts_at, ends_at
from public.appointments
where status <> 'Cancelled'
on conflict (appointment_id) do update
set starts_at = excluded.starts_at,
    ends_at = excluded.ends_at;
