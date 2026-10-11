-- ALTF4 — Shimmer and Shield Car Coating
-- Supabase (Postgres) schema. Replaces the SQLite-flavored draft in
-- database/schema.sql. Not yet reviewed by the team.
--
-- Key differences from the draft:
--   * Auth is handled by Supabase Auth (auth.users) -> no password_hash.
--     `users` becomes `profiles`, one row per auth user.
--   * Appointments use starts_at/ends_at (timestamptz). Double booking is
--     blocked by an exclusion constraint on the time range, so it respects
--     service duration and ignores cancelled bookings.
--   * Row Level Security on every table: clients see their own data,
--     staff/admin see everything.
--   * `reports_daily` is a view, not a table, so it can never go stale.
--
-- ASSUMPTION: the shop has ONE service bay, so only one active appointment
-- can overlap any time range. For N bays, this constraint must change.

create extension if not exists btree_gist;

-- ---------------------------------------------------------------- tables

create table public.profiles (
    id          uuid primary key references auth.users (id) on delete cascade,
    role        text not null default 'client' check (role in ('client', 'staff', 'admin')),
    full_name   text not null default '',
    email       text,
    phone       text,
    created_at  timestamptz not null default now()
);

create table public.vehicles (
    id            bigint generated always as identity primary key,
    owner_id      uuid not null references public.profiles (id) on delete cascade,
    make          text not null,
    model         text not null,
    type          text,                -- e.g. SUV, Sedan, Truck
    plate_number  text,
    created_at    timestamptz not null default now()
);

create table public.services (
    id              bigint generated always as identity primary key,
    name            text not null,     -- e.g. 'Ceramic Pro (9H)'
    description     text,
    price_php       numeric(10, 2) not null check (price_php >= 0),
    duration_mins   integer not null check (duration_mins > 0),  -- bay time
    warranty_years  integer,
    is_active       boolean not null default true
);

create sequence public.appointment_ref_seq;

create table public.appointments (
    id             bigint generated always as identity primary key,
    ref_id         text unique not null,      -- e.g. 'ALT-PH-092' (set by trigger)
    client_id      uuid not null references public.profiles (id),
    vehicle_id     bigint not null references public.vehicles (id),
    service_id     bigint not null references public.services (id),
    starts_at      timestamptz not null,
    ends_at        timestamptz not null,      -- set by trigger from service duration
    status         text not null default 'Pending'
                   check (status in ('Pending', 'Ongoing', 'Completed', 'Cancelled')),
    total_due_php  numeric(10, 2) not null,   -- set by trigger from service price
    created_at     timestamptz not null default now(),
    check (ends_at > starts_at),
    constraint no_double_booking
        exclude using gist (tstzrange(starts_at, ends_at) with &&)
        where (status <> 'Cancelled')
);

-- Public, anonymized view of taken time ranges. Clients can't read other
-- people's appointments, but they must see which slots are gone (the
-- `slot.booked` event). Kept in sync by a trigger below.
create table public.booked_slots (
    appointment_id  bigint primary key references public.appointments (id) on delete cascade,
    starts_at       timestamptz not null,
    ends_at         timestamptz not null
);

create table public.notifications (
    id              bigint generated always as identity primary key,
    appointment_id  bigint not null references public.appointments (id) on delete cascade,
    recipient_id    uuid not null references public.profiles (id) on delete cascade,
    channel         text not null default 'in_app' check (channel in ('in_app', 'sms', 'email')),
    message         text not null,
    created_at      timestamptz not null default now(),
    sent_at         timestamptz
);

create index on public.vehicles (owner_id);
create index on public.appointments (client_id);
create index on public.appointments (starts_at);
create index on public.notifications (recipient_id);

-- Daily rollup for the Reports screen. security_invoker = RLS of the
-- querying user applies (staff see everything, clients only their own).
create view public.reports_daily with (security_invoker = true) as
select
    (starts_at at time zone 'Asia/Manila')::date                          as report_date,
    coalesce(sum(total_due_php) filter (where status = 'Completed'), 0)   as total_revenue_php,
    count(*) filter (where status = 'Completed')                          as completed_jobs
from public.appointments
group by 1;

-- ------------------------------------------------------ helper functions

create function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
    select exists (
        select 1 from public.profiles
        where id = (select auth.uid()) and role in ('staff', 'admin')
    );
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
    select exists (
        select 1 from public.profiles
        where id = (select auth.uid()) and role = 'admin'
    );
$$;

-- ------------------------------------------------------------- triggers

-- New auth user -> profile. Role is ALWAYS 'client' here; never trust
-- signup metadata for it. Promote staff/admin from the dashboard SQL editor.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    insert into public.profiles (id, full_name, email, phone)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'full_name', ''),
        new.email,
        new.raw_user_meta_data ->> 'phone'
    );
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Block self-promotion. auth.uid() is null for dashboard/service-role
-- sessions, which are allowed to change roles.
create function public.protect_profile_role() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    if new.role is distinct from old.role
       and (select auth.uid()) is not null
       and not public.is_admin() then
        raise exception 'Only an admin can change roles';
    end if;
    return new;
end;
$$;

create trigger profiles_protect_role
    before update on public.profiles
    for each row execute function public.protect_profile_role();

-- Server decides ref, end time, and price. The client only supplies
-- vehicle, service, and start time.
create function public.prepare_appointment() returns trigger
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

    new.ends_at := new.starts_at + make_interval(mins => v_duration);

    if tg_op = 'INSERT' then
        if new.starts_at <= now() then
            raise exception 'Appointment must start in the future';
        end if;
        if not exists (
            select 1 from public.vehicles
            where id = new.vehicle_id and owner_id = new.client_id
        ) then
            raise exception 'Vehicle does not belong to this client';
        end if;
        v_n := nextval('public.appointment_ref_seq');
        new.ref_id := 'ALT-PH-' || case when v_n < 1000 then lpad(v_n::text, 3, '0') else v_n::text end;
        new.total_due_php := v_price;
    end if;
    return new;
end;
$$;

create trigger appointments_prepare
    before insert or update of starts_at, service_id on public.appointments
    for each row execute function public.prepare_appointment();

-- Keep booked_slots in step with appointments.
create function public.sync_booked_slot() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    if tg_op in ('UPDATE', 'DELETE') then
        delete from public.booked_slots where appointment_id = old.id;
    end if;
    if tg_op in ('INSERT', 'UPDATE') and new.status <> 'Cancelled' then
        insert into public.booked_slots (appointment_id, starts_at, ends_at)
        values (new.id, new.starts_at, new.ends_at);
    end if;
    return null;
end;
$$;

create trigger appointments_sync_slot
    after insert or update or delete on public.appointments
    for each row execute function public.sync_booked_slot();

-- Automated in-app notice on booking and on every status change.
-- SMS/email delivery would be an Edge Function reading this table later.
create function public.notify_appointment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    insert into public.notifications (appointment_id, recipient_id, message)
    values (
        new.id,
        new.client_id,
        case when tg_op = 'INSERT'
             then format('Booking %s received. We will confirm shortly.', new.ref_id)
             else format('Your appointment %s is now %s.', new.ref_id, new.status)
        end
    );
    return null;
end;
$$;

create trigger appointments_notify_insert
    after insert on public.appointments
    for each row execute function public.notify_appointment();

create trigger appointments_notify_status
    after update of status on public.appointments
    for each row when (old.status is distinct from new.status)
    execute function public.notify_appointment();

-- Clients cancel through this function (they get no UPDATE policy).
create function public.cancel_appointment(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
    update public.appointments
    set status = 'Cancelled'
    where id = p_id and client_id = (select auth.uid()) and status = 'Pending';
    if not found then
        raise exception 'Appointment not found or cannot be cancelled';
    end if;
end;
$$;

revoke execute on function public.cancel_appointment(bigint) from public, anon;
grant  execute on function public.cancel_appointment(bigint) to authenticated;

-- ------------------------------------------------- row level security

alter table public.profiles      enable row level security;
alter table public.vehicles      enable row level security;
alter table public.services      enable row level security;
alter table public.appointments  enable row level security;
alter table public.booked_slots  enable row level security;
alter table public.notifications enable row level security;

-- profiles (rows are created by trigger, so no INSERT policy)
create policy "profiles: read own or staff" on public.profiles
    for select to authenticated
    using (id = (select auth.uid()) or public.is_staff());
create policy "profiles: update own or admin" on public.profiles
    for update to authenticated
    using (id = (select auth.uid()) or public.is_admin())
    with check (id = (select auth.uid()) or public.is_admin());

-- vehicles
create policy "vehicles: read own or staff" on public.vehicles
    for select to authenticated
    using (owner_id = (select auth.uid()) or public.is_staff());
create policy "vehicles: insert own or staff" on public.vehicles
    for insert to authenticated
    with check (owner_id = (select auth.uid()) or public.is_staff());
create policy "vehicles: update own or staff" on public.vehicles
    for update to authenticated
    using (owner_id = (select auth.uid()) or public.is_staff())
    with check (owner_id = (select auth.uid()) or public.is_staff());
create policy "vehicles: delete own or staff" on public.vehicles
    for delete to authenticated
    using (owner_id = (select auth.uid()) or public.is_staff());

-- services
create policy "services: read all" on public.services
    for select to authenticated using (true);
create policy "services: admin writes" on public.services
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

-- appointments
create policy "appointments: read own or staff" on public.appointments
    for select to authenticated
    using (client_id = (select auth.uid()) or public.is_staff());
create policy "appointments: client books pending, staff books any" on public.appointments
    for insert to authenticated
    with check (
        (client_id = (select auth.uid()) and status = 'Pending')
        or public.is_staff()
    );
create policy "appointments: staff update" on public.appointments
    for update to authenticated
    using (public.is_staff()) with check (public.is_staff());
create policy "appointments: admin delete" on public.appointments
    for delete to authenticated using (public.is_admin());

-- booked_slots: read-only for everyone signed in
create policy "booked_slots: read all" on public.booked_slots
    for select to authenticated using (true);

-- notifications: recipients read their own; staff read all
create policy "notifications: read own or staff" on public.notifications
    for select to authenticated
    using (recipient_id = (select auth.uid()) or public.is_staff());

revoke all on public.reports_daily from anon;

-- --------------------------------------------------------- realtime

alter publication supabase_realtime
    add table public.appointments, public.booked_slots, public.notifications;
