-- Ship Your Cart v4: carrier rate cards, instant prices, auto-quote + first-shipment discount
-- Run once in Supabase → SQL Editor (after v2 and v3). Safe to re-run.

-- 1. Carriers and their rate cards (your COST prices). Only admins can read these tables;
--    customers only ever see final prices through quote().
create table if not exists public.carriers (
  id          text primary key,                 -- 'aramex', 'fedex', 'dhl', ...
  name        text not null,
  name_ar     text, name_ms text,
  transit_en  text, transit_ar text, transit_ms text,
  active      boolean not null default false,
  fuel_pct    numeric(6,2) not null default 0,  -- carrier fuel surcharge on top of the card
  markup_pct  numeric(6,2) not null default 0,  -- your profit on top
  vol_divisor int not null default 5000,        -- volumetric weight = L x W x H (cm) / divisor
  max_kg      numeric(8,2) not null default 70,
  sort        int not null default 0
);
create table if not exists public.carrier_zones (
  carrier      text not null references public.carriers(id) on delete cascade,
  country_code text not null,                   -- ISO 2 letters, e.g. SA
  zone         text not null,
  primary key (carrier, country_code)
);
create table if not exists public.carrier_rates (
  carrier text not null references public.carriers(id) on delete cascade,
  zone    text not null,
  max_kg  numeric(8,2) not null,                -- price for a chargeable weight up to this
  price   numeric(10,2) not null,               -- RM
  primary key (carrier, zone, max_kg)
);
create table if not exists public.carrier_rates_over (  -- heavier than the last weight on the card
  carrier text not null references public.carriers(id) on delete cascade,
  zone    text not null,
  from_kg numeric(8,2) not null,                -- applies when chargeable weight is above this
  per_kg  numeric(10,2) not null,               -- RM x total weight (rounded up to 1 kg), DHL "multiplier"
  primary key (carrier, zone, from_kg)
);
create table if not exists public.settings (
  key   text primary key,
  value numeric not null
);
insert into public.settings (key, value) values ('first_discount_pct', 10), ('first_discount_max', 50)
  on conflict (key) do nothing;

alter table public.carriers           enable row level security;
alter table public.carrier_zones      enable row level security;
alter table public.carrier_rates      enable row level security;
alter table public.carrier_rates_over enable row level security;
alter table public.settings           enable row level security;
do $$ declare t text; begin
  foreach t in array array['carriers','carrier_zones','carrier_rates','carrier_rates_over','settings'] loop
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin', t);
  end loop;
end $$;

alter table public.carriers add column if not exists name_ar text;
alter table public.carriers add column if not exists name_ms text;

-- 2. Shipment fields for automatic prices
alter table public.shipments add column if not exists ship_cc       text;
alter table public.shipments add column if not exists rate_carrier  text;
alter table public.shipments add column if not exists price_list_rm numeric(10,2);
alter table public.shipments add column if not exists discount_rm   numeric(10,2);
alter table public.shipments add column if not exists auto_quoted   boolean not null default false;

-- 3. Price for one carrier (final customer price in whole RM, or null if not available)
create or replace function public.price_for(p_carrier text, p_cc text, p_kg numeric)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare c public.carriers; z text; p numeric; ov numeric;
begin
  if p_kg is null or p_kg <= 0 then return null; end if;
  select * into c from public.carriers where id = p_carrier and active;
  if not found or p_kg > c.max_kg then return null; end if;
  select zone into z from public.carrier_zones where carrier = p_carrier and country_code = upper(p_cc);
  if z is null then return null; end if;
  select price into p from public.carrier_rates
   where carrier = p_carrier and zone = z and max_kg >= p_kg order by max_kg limit 1;
  if p is null then
    select per_kg into ov from public.carrier_rates_over
     where carrier = p_carrier and zone = z and from_kg < p_kg order by from_kg desc limit 1;
    if ov is null then return null; end if;
    p := ceil(p_kg) * ov;
  end if;
  return ceil(p * (1 + c.fuel_pct / 100) * (1 + c.markup_pct / 100));
end $$;
revoke all on function public.price_for(text, text, numeric) from public, anon, authenticated;

-- 4. Public price check: every active carrier that serves the country
drop function if exists public.quote(text, numeric);
create or replace function public.quote(p_cc text, p_kg numeric)
returns table (carrier text, name text, name_ar text, name_ms text, transit_en text, transit_ar text, transit_ms text, price_rm numeric)
language sql stable security definer set search_path = public as $$
  select * from (
    select c.id, c.name, c.name_ar, c.name_ms, c.transit_en, c.transit_ar, c.transit_ms, public.price_for(c.id, p_cc, round(p_kg, 2)) as price_rm
      from public.carriers c where c.active order by c.sort, c.id
  ) q where q.price_rm is not null order by q.price_rm;
$$;
grant execute on function public.quote(text, numeric) to anon, authenticated;

create or replace function public.quote_countries()
returns setof text language sql stable security definer set search_path = public as $$
  select distinct z.country_code from public.carrier_zones z
    join public.carriers c on c.id = z.carrier and c.active
   where exists (select 1 from public.carrier_rates r where r.carrier = z.carrier and r.zone = z.zone)
   order by 1;
$$;
grant execute on function public.quote_countries() to anon, authenticated;

create or replace function public.first_discount_info()
returns table (pct numeric, max_rm numeric) language sql stable security definer set search_path = public as $$
  select (select value from public.settings where key = 'first_discount_pct'),
         (select value from public.settings where key = 'first_discount_max');
$$;
grant execute on function public.first_discount_info() to anon, authenticated;

-- 5. Customer requests a shipment with a chosen carrier: priced instantly when all weights are known
create or replace function public.request_shipment_v2(
  p_parcels bigint[], p_carrier text, p_name text, p_phone text,
  p_address text, p_city text, p_country text, p_cc text, p_note text)
returns bigint language plpgsql security definer set search_path = public as $$
declare sid bigint; n int; missing boolean; kg numeric; div int; price numeric; disc numeric := 0;
        pct numeric; mx numeric; cname text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select count(*) into n from public.parcels
   where id = any(p_parcels) and customer_id = auth.uid() and status = 'received' and shipment_id is null;
  if n = 0 or n <> coalesce(array_length(p_parcels, 1), 0) then raise exception 'invalid parcels'; end if;
  if coalesce(trim(p_name),'') = '' or coalesce(trim(p_address),'') = '' or coalesce(trim(p_country),'') = '' then
    raise exception 'address required';
  end if;

  select vol_divisor, name into div, cname from public.carriers where id = p_carrier and active;
  select bool_or(weight_kg is null),
         sum(greatest(weight_kg, coalesce(length_cm * width_cm * height_cm / coalesce(div, 5000), 0)))
    into missing, kg
    from public.parcels where id = any(p_parcels);
  if not missing and cname is not null then
    price := public.price_for(p_carrier, p_cc, round(kg, 2));
  end if;

  if price is not null and not exists (
       select 1 from public.shipments where customer_id = auth.uid() and status <> 'cancelled') then
    select value into pct from public.settings where key = 'first_discount_pct';
    select value into mx  from public.settings where key = 'first_discount_max';
    disc := least(round(price * coalesce(pct, 0) / 100, 2), coalesce(mx, 0));
  end if;

  insert into public.shipments (customer_id, method, ship_name, ship_phone, ship_address, ship_city, ship_country, ship_cc,
         customer_note, weight_kg, rate_carrier, carrier, status, price_list_rm, discount_rm, price_rm, auto_quoted)
  values (auth.uid(), case when p_carrier in ('dhl','fedex') then 'express' else 'air' end,
          p_name, p_phone, p_address, p_city, p_country, upper(p_cc), p_note, round(kg, 2),
          nullif(p_carrier, ''), cname,
          case when price is null then 'requested' else 'quoted' end,
          price, nullif(disc, 0), case when price is null then null else price - disc end, price is not null)
  returning id into sid;
  update public.parcels set shipment_id = sid, status = 'in_shipment' where id = any(p_parcels);
  update public.customers set ship_name = p_name, ship_phone = p_phone, ship_address = p_address,
         ship_city = p_city, ship_country = p_country where id = auth.uid();
  return sid;
end $$;
grant execute on function public.request_shipment_v2(bigint[], text, text, text, text, text, text, text, text) to authenticated;

-- 6. Starting data. The current GCC price list (already includes profit), so prices work today.
--    Aramex / FedEx / DHL stay off until their rate cards are loaded.
insert into public.carriers (id, name, name_ar, name_ms, active, markup_pct, max_kg, sort) values
  ('syc_air', 'Air freight', 'شحن جوي', 'Kargo udara', true, 0, 20, 10)
  on conflict (id) do nothing;
insert into public.carriers (id, name, active, max_kg, sort) values
  ('aramex', 'Aramex', false, 70, 20),
  ('fedex',  'FedEx',  false, 70, 30),
  ('dhl',    'DHL Express', false, 70, 40)
  on conflict (id) do nothing;
insert into public.carrier_zones (carrier, country_code, zone)
  select 'syc_air', cc, 'GCC' from unnest(array['SA','AE','OM','KW','QA','BH']) cc
  on conflict do nothing;
insert into public.carrier_rates (carrier, zone, max_kg, price)
  select 'syc_air', 'GCC', kg, p from (values
    (1,220),(2,290),(3,335),(4,390),(5,450),(6,500),(7,560),(8,610),(9,670),(10,720),
    (11,780),(12,830),(13,890),(14,940),(15,1000),(16,1050),(17,1110),(18,1170),(19,1220),(20,1290)) v(kg, p)
  on conflict do nothing;
