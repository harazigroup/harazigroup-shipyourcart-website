-- Ship Your Cart v5: declared contents + value on every shipment, and public tracking
-- Run once in Supabase → SQL Editor (after v4). Safe to re-run.

alter table public.shipments add column if not exists contents          text;
alter table public.shipments add column if not exists declared_value_rm numeric(12,2);

-- Same as request_shipment_v2, plus what is inside and its total value (for customs)
create or replace function public.request_shipment_v3(
  p_parcels bigint[], p_carrier text, p_name text, p_phone text,
  p_address text, p_city text, p_country text, p_cc text, p_note text,
  p_contents text, p_value numeric)
returns bigint language plpgsql security definer set search_path = public as $$
declare sid bigint;
begin
  if coalesce(trim(p_contents), '') = '' then raise exception 'contents required'; end if;
  if p_value is null or p_value <= 0 then raise exception 'value required'; end if;
  sid := public.request_shipment_v2(p_parcels, p_carrier, p_name, p_phone, p_address, p_city, p_country, p_cc, p_note);
  update public.shipments set contents = left(trim(p_contents), 500), declared_value_rm = round(p_value, 2) where id = sid;
  return sid;
end $$;
grant execute on function public.request_shipment_v3(bigint[], text, text, text, text, text, text, text, text, text, numeric) to authenticated;

-- Public tracking: needs the customer code AND the shipment number, shows status only (no address or name)
create or replace function public.track(p_code text, p_id bigint)
returns table (id bigint, status text, carrier text, tracking_no text, tracking_url text, country text, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.id, s.status, s.carrier, s.tracking_no, s.tracking_url, s.ship_country, s.updated_at
    from public.shipments s join public.customers c on c.id = s.customer_id
   where s.id = p_id and upper(c.code) = upper(trim(p_code)) and s.status <> 'cancelled';
$$;
grant execute on function public.track(text, bigint) to anon, authenticated;
