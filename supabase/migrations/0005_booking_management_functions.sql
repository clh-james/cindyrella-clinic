-- These run as the function owner (security definer), so they can check
-- and update appointments without opening a broad SELECT/UPDATE policy to
-- the public. Each one enforces its own narrow rule internally instead.

create or replace function is_slot_available(
  p_branch_id uuid,
  p_date date,
  p_time text,
  p_exclude_appointment_id uuid default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_blocked boolean;
  v_capacity integer;
  v_count integer;
begin
  select exists(
    select 1 from blocked_dates
    where blocked_date = p_date and (branch_id = p_branch_id or branch_id is null)
  ) into v_blocked;

  if v_blocked then
    return false;
  end if;

  select coalesce(max_bookings_per_slot, 3) into v_capacity
  from branch_settings where branch_id = p_branch_id;

  if v_capacity is null then
    v_capacity := 3;
  end if;

  select count(*) into v_count
  from appointments
  where branch_id = p_branch_id
    and appointment_date = p_date
    and appointment_time = p_time
    and status <> 'cancelled'
    and (p_exclude_appointment_id is null or id <> p_exclude_appointment_id);

  return v_count < v_capacity;
end;
$$;

grant execute on function is_slot_available(uuid, date, text, uuid) to anon, authenticated;

-- Looks up a booking for the "manage my booking" page. Only returns a row
-- when the supplied email matches the booking's customer — this is the
-- entire access check, so no public SELECT policy on appointments is needed.
create or replace function get_booking_for_management(p_reference text, p_email text)
returns table (
  appointment_id uuid,
  reference_number text,
  status text,
  payment_status text,
  appointment_date date,
  appointment_time text,
  treatment_name text,
  treatment_price integer,
  branch_id uuid,
  branch_name text,
  customer_first_name text,
  customer_phone text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    a.id, a.reference_number, a.status::text, a.payment_status::text,
    a.appointment_date, a.appointment_time,
    t.name, t.session_price, a.branch_id, b.name, c.first_name, c.phone
  from appointments a
  join treatments t on t.id = a.treatment_id
  join branches b on b.id = a.branch_id
  join customers c on c.id = a.customer_id
  where a.reference_number = p_reference
    and lower(c.email) = lower(p_email);
end;
$$;

grant execute on function get_booking_for_management(text, text) to anon, authenticated;

create or replace function cancel_booking(p_reference text, p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select a.id into v_id
  from appointments a
  join customers c on c.id = a.customer_id
  where a.reference_number = p_reference and lower(c.email) = lower(p_email);

  if v_id is null then
    return false;
  end if;

  update appointments set status = 'cancelled' where id = v_id;
  return true;
end;
$$;

grant execute on function cancel_booking(text, text) to anon, authenticated;

-- Returns null on success, or an error code string: 'not_found' | 'slot_unavailable'.
create or replace function reschedule_booking(
  p_reference text,
  p_email text,
  p_new_date date,
  p_new_time text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_branch uuid;
  v_available boolean;
begin
  select a.id, a.branch_id into v_id, v_branch
  from appointments a
  join customers c on c.id = a.customer_id
  where a.reference_number = p_reference and lower(c.email) = lower(p_email);

  if v_id is null then
    return 'not_found';
  end if;

  select is_slot_available(v_branch, p_new_date, p_new_time, v_id) into v_available;
  if not v_available then
    return 'slot_unavailable';
  end if;

  update appointments
  set appointment_date = p_new_date, appointment_time = p_new_time, status = 'pending'
  where id = v_id;

  return null;
end;
$$;

grant execute on function reschedule_booking(text, text, date, text) to anon, authenticated;
