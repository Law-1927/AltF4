-- Security hardening based on the 2026-10-30 static review.

-- Helper functions are used by authenticated policies, but should not be
-- exposed to anonymous callers.
revoke execute on function public.is_staff() from public, anon;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Bound profile data and keep the profile email in sync with Supabase Auth.
alter table public.profiles
    add constraint profiles_full_name_length
        check (char_length(full_name) <= 120) not valid,
    add constraint profiles_full_name_no_control_chars
        check (full_name !~ '[[:cntrl:]]') not valid,
    add constraint profiles_phone_format
        check (
            phone is null
            or (
                char_length(btrim(phone)) between 7 and 32
                and phone ~ '^\+?[0-9][0-9 ()-]*$'
            )
        ) not valid;

create function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    if new.id = (select auth.uid())
       and not public.is_admin()
       and new.email is distinct from old.email then
        raise exception 'Profile email is managed by authentication';
    end if;
    return new;
end;
$$;

create trigger profiles_guard_update
    before update on public.profiles
    for each row execute function public.guard_profile_update();

-- Keep appointment-derived values consistent and validate vehicle ownership
-- for inserts and any server-side reassignment.
create or replace function public.prepare_appointment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
    v_duration integer;
    v_price    numeric(10, 2);
    v_n        bigint;
begin
    select duration_mins, price_php into v_duration, v_price
    from public.services
    where id = new.service_id and is_active;
    if not found then
        raise exception 'Service not found or no longer offered';
    end if;

    if tg_op = 'INSERT' then
        if new.starts_at <= now() then
            raise exception 'Appointment must start in the future';
        end if;
    elsif new.starts_at is distinct from old.starts_at
          and new.starts_at <= now() then
        raise exception 'Appointment must start in the future';
    end if;

    if not exists (
        select 1 from public.vehicles
        where id = new.vehicle_id and owner_id = new.client_id
    ) then
        raise exception 'Vehicle does not belong to this client';
    end if;

    new.ends_at := new.starts_at + make_interval(mins => v_duration);

    if tg_op = 'INSERT' then
        v_n := nextval('public.appointment_ref_seq');
        new.ref_id := 'ALT-PH-' || case when v_n < 1000 then lpad(v_n::text, 3, '0') else v_n::text end;
        new.total_due_php := v_price;
    elsif new.service_id is distinct from old.service_id then
        new.total_due_php := v_price;
    end if;

    return new;
end;
$$;

drop trigger appointments_prepare on public.appointments;
create trigger appointments_prepare
    before insert or update of starts_at, service_id, vehicle_id, client_id
    on public.appointments
    for each row execute function public.prepare_appointment();

-- Staff may only change appointment status through the application. Admins
-- and trusted SQL/service-role operations retain their existing ability to
-- correct other fields; transition rules apply to authenticated staff.
create function public.guard_appointment_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    if (select auth.uid()) is null or public.is_admin() then
        return new;
    end if;

    if not public.is_staff() then
        raise exception 'Only staff can update appointments';
    end if;

    if new.id is distinct from old.id
       or new.ref_id is distinct from old.ref_id
       or new.client_id is distinct from old.client_id
       or new.vehicle_id is distinct from old.vehicle_id
       or new.service_id is distinct from old.service_id
       or new.starts_at is distinct from old.starts_at
       or new.ends_at is distinct from old.ends_at
       or new.total_due_php is distinct from old.total_due_php
       or new.created_at is distinct from old.created_at then
        raise exception 'Staff may only change appointment status';
    end if;

    if new.status is distinct from old.status
       and not (
           (old.status = 'Pending' and new.status in ('Ongoing', 'Cancelled'))
           or (old.status = 'Ongoing' and new.status in ('Completed', 'Cancelled'))
       ) then
        raise exception 'Invalid appointment status transition';
    end if;

    return new;
end;
$$;

create trigger appointments_guard_update
    before update on public.appointments
    for each row execute function public.guard_appointment_update();

create table public.audit_log (
    id          bigint generated always as identity primary key,
    actor_id    uuid references auth.users (id) on delete set null,
    action      text not null check (action in (
                    'appointment_created',
                    'appointment_updated',
                    'appointment_deleted',
                    'profile_updated',
                    'profile_deleted',
                    'dashboard_view',
                    'reports_view',
                    'reports_export'
                )),
    entity      text not null check (entity in ('appointments', 'profiles')),
    entity_id   text not null,
    details     jsonb not null default '{}'::jsonb,
    created_at  timestamptz not null default now()
);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from public, anon, authenticated;
grant select on public.audit_log to authenticated;
create policy "audit_log: admin read" on public.audit_log
    for select to authenticated using (public.is_admin());

create function public.audit_profile_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    if tg_op = 'DELETE' then
        insert into public.audit_log (actor_id, action, entity, entity_id, details)
        values (
            (select auth.uid()),
            'profile_deleted',
            'profiles',
            old.id::text,
            jsonb_build_object('role', old.role)
        );
        return old;
    end if;

    if old.role is distinct from new.role
       or old.full_name is distinct from new.full_name
       or old.email is distinct from new.email
       or old.phone is distinct from new.phone then
        insert into public.audit_log (actor_id, action, entity, entity_id, details)
        values (
            (select auth.uid()),
            'profile_updated',
            'profiles',
            new.id::text,
            jsonb_build_object(
                'name_changed', old.full_name is distinct from new.full_name,
                'email_changed', old.email is distinct from new.email,
                'phone_changed', old.phone is distinct from new.phone,
                'role_before', case when old.role is distinct from new.role then old.role end,
                'role_after', case when old.role is distinct from new.role then new.role end
            )
        );
    end if;
    return new;
end;
$$;

create trigger profiles_audit_change
    after update or delete on public.profiles
    for each row execute function public.audit_profile_change();

create function public.audit_appointment_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    if tg_op = 'INSERT' then
        insert into public.audit_log (actor_id, action, entity, entity_id, details)
        values (
            (select auth.uid()),
            'appointment_created',
            'appointments',
            new.id::text,
            jsonb_build_object('status', new.status)
        );
        return new;
    elsif tg_op = 'DELETE' then
        insert into public.audit_log (actor_id, action, entity, entity_id, details)
        values (
            (select auth.uid()),
            'appointment_deleted',
            'appointments',
            old.id::text,
            jsonb_build_object('status', old.status)
        );
        return old;
    end if;

    if old.status is distinct from new.status
       or old.service_id is distinct from new.service_id
       or old.client_id is distinct from new.client_id
       or old.vehicle_id is distinct from new.vehicle_id
       or old.starts_at is distinct from new.starts_at
       or old.total_due_php is distinct from new.total_due_php then
        insert into public.audit_log (actor_id, action, entity, entity_id, details)
        values (
            (select auth.uid()),
            'appointment_updated',
            'appointments',
            new.id::text,
            jsonb_build_object(
                'status_before', case when old.status is distinct from new.status then old.status end,
                'status_after', case when old.status is distinct from new.status then new.status end,
                'service_changed', old.service_id is distinct from new.service_id,
                'client_changed', old.client_id is distinct from new.client_id,
                'vehicle_changed', old.vehicle_id is distinct from new.vehicle_id,
                'start_changed', old.starts_at is distinct from new.starts_at,
                'total_changed', old.total_due_php is distinct from new.total_due_php
            )
        );
    end if;
    return new;
end;
$$;

create trigger appointments_audit_change
    after insert or update or delete on public.appointments
    for each row execute function public.audit_appointment_change();

create function public.record_staff_access(p_action text) returns void
language plpgsql security definer set search_path = '' as $$
begin
    if not public.is_staff() then
        raise exception 'Staff access required';
    end if;
    if p_action is null
       or p_action not in ('dashboard_view', 'reports_view', 'reports_export') then
        raise exception 'Unsupported audit action';
    end if;

    insert into public.audit_log (actor_id, action, entity, entity_id)
    values ((select auth.uid()), p_action, 'appointments', 'collection');
end;
$$;

revoke execute on function public.record_staff_access(text) from public, anon;
grant execute on function public.record_staff_access(text) to authenticated;

revoke execute on function public.guard_profile_update() from public, anon, authenticated;
revoke execute on function public.guard_appointment_update() from public, anon, authenticated;
revoke execute on function public.audit_profile_change() from public, anon, authenticated;
revoke execute on function public.audit_appointment_change() from public, anon, authenticated;
