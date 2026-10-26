-- Ship Your Cart v6: online shop (Buy for me products). Orders are stored as shipments (kind = 'store_direct' or 'store_wh')
-- so card / USDT payment, admin panel, emails and tracking all work the same way.
-- Run once in Supabase → SQL Editor (after v5). Safe to re-run.

create table if not exists public.products (
  id          bigint generated always as identity primary key,
  category    text not null default 'coffee',
  brand       text,
  name_en     text not null,
  name_ar     text,
  name_ms     text,
  desc_en     text, desc_ar text, desc_ms text,
  price_rm    numeric(10,2),             -- final selling price per unit (your cost + profit)
  weight_kg   numeric(8,3) not null default 0.6,
  photo       text,                      -- public URL
  active      boolean not null default false,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.products enable row level security;
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select to anon, authenticated using (active and price_rm is not null);
drop policy if exists products_admin on public.products;
create policy products_admin on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.products to anon, authenticated;

insert into public.settings (key, value) values ('store_min_items', 6), ('store_pack_kg', 0.3)
  on conflict (key) do nothing;
create or replace function public.store_info()
returns table (min_items numeric, pack_kg numeric) language sql stable security definer set search_path = public as $$
  select (select value from public.settings where key = 'store_min_items'),
         (select value from public.settings where key = 'store_pack_kg');
$$;
grant execute on function public.store_info() to anon, authenticated;

-- product photos: public bucket, only admins upload
insert into storage.buckets (id, name, public) values ('product-photos', 'product-photos', true)
  on conflict (id) do update set public = true;
drop policy if exists "product photos admin" on storage.objects;
create policy "product photos admin" on storage.objects for all to authenticated
  using (bucket_id = 'product-photos' and public.is_admin())
  with check (bucket_id = 'product-photos' and public.is_admin());

-- store orders live in shipments
alter table public.shipments add column if not exists kind     text not null default 'parcels';
alter table public.shipments add column if not exists items    jsonb;
alter table public.shipments add column if not exists items_rm numeric(10,2);
alter table public.shipments add column if not exists shipping_rm numeric(10,2);

-- p_items: [{"id": 1, "qty": 3}, ...]; p_mode: 'direct' (we ship to the address) or 'wh' (to your Malaysian address, ship later)
create or replace function public.create_store_order(
  p_items jsonb, p_mode text, p_carrier text,
  p_name text, p_phone text, p_address text, p_city text, p_country text, p_cc text, p_note text)
returns bigint language plpgsql security definer set search_path = public as $$
declare it jsonb; pr public.products; q int; total_qty int := 0; items_rm numeric := 0; kg numeric := 0;
        lines jsonb := '[]'::jsonb; minq numeric; pack numeric; ship numeric; cname text; sid bigint;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'empty cart'; end if;
  for it in select * from jsonb_array_elements(p_items) loop
    q := greatest(0, least(500, coalesce((it ->> 'qty')::int, 0)));
    if q = 0 then continue; end if;
    select * into pr from public.products where id = (it ->> 'id')::bigint and active and price_rm is not null;
    if not found then raise exception 'product unavailable'; end if;
    total_qty := total_qty + q;
    items_rm := items_rm + pr.price_rm * q;
    kg := kg + pr.weight_kg * q;
    lines := lines || jsonb_build_object('id', pr.id, 'name', pr.name_en, 'name_ar', pr.name_ar, 'qty', q, 'price', pr.price_rm);
  end loop;
  select value into minq from public.settings where key = 'store_min_items';
  if total_qty < coalesce(minq, 1) then raise exception 'minimum % items', coalesce(minq, 1); end if;
  select value into pack from public.settings where key = 'store_pack_kg';
  kg := round(kg + coalesce(pack, 0), 2);

  if p_mode = 'direct' then
    if coalesce(trim(p_name),'') = '' or coalesce(trim(p_address),'') = '' or coalesce(trim(p_cc),'') = '' then
      raise exception 'address required';
    end if;
    select name into cname from public.carriers where id = p_carrier and active;
    ship := public.price_for(p_carrier, p_cc, kg);
    if ship is null then raise exception 'no shipping price'; end if;
    insert into public.shipments (customer_id, kind, status, method, items, items_rm, shipping_rm, price_rm, price_list_rm,
           weight_kg, carrier, rate_carrier, ship_name, ship_phone, ship_address, ship_city, ship_country, ship_cc, customer_note, auto_quoted)
    values (auth.uid(), 'store_direct', 'quoted', 'air', lines, items_rm, ship, items_rm + ship, items_rm + ship,
           kg, cname, p_carrier, p_name, p_phone, p_address, p_city, p_country, upper(p_cc), p_note, true)
    returning id into sid;
    update public.customers set ship_name = p_name, ship_phone = p_phone, ship_address = p_address,
           ship_city = p_city, ship_country = p_country where id = auth.uid();
  else
    insert into public.shipments (customer_id, kind, status, method, items, items_rm, shipping_rm, price_rm, price_list_rm,
           weight_kg, customer_note, auto_quoted)
    values (auth.uid(), 'store_wh', 'quoted', 'air', lines, items_rm, 0, items_rm, items_rm, kg, p_note, true)
    returning id into sid;
  end if;
  return sid;
end $$;
grant execute on function public.create_store_order(jsonb, text, text, text, text, text, text, text, text, text) to authenticated;

-- first-shipment discount: shop orders do not count as a shipment
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
       select 1 from public.shipments where customer_id = auth.uid() and status <> 'cancelled' and kind = 'parcels') then
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

-- the customer may cancel an unpaid shop order
create or replace function public.cancel_store_order(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.shipments set status = 'cancelled'
   where id = p_id and customer_id = auth.uid() and kind like 'store%' and status = 'quoted';
end $$;
grant execute on function public.cancel_store_order(bigint) to authenticated;

-- starter products: OldTown White Coffee range (price per bag, minimum 6 bags per order). Edit prices in the admin panel.
insert into public.products (category, brand, name_en, name_ar, name_ms, desc_en, desc_ar, desc_ms, price_rm, weight_kg, photo, active, sort)
select 'coffee', 'OLDTOWN', v.en, v.ar, v.ms, v.den, v.dar, v.dms, 21, v.kg, '/assets/img/products/oldtown-' || v.img || '.webp', true, v.s from (values
  ('OLDTOWN White Coffee Classic 3in1', 'أولد تاون قهوة بيضاء كلاسيك 3 في 1', 'OLDTOWN White Coffee Klasik 3in1',
   'Smooth, traditional Ipoh white coffee. 15 sticks.', 'قهوة إيبوه البيضاء التقليدية، ناعمة وغنية. 15 ظرف.', 'Kopi putih Ipoh tradisional yang lembut. 15 paket.', 0.6, 'classic', 10),
  ('OLDTOWN White Coffee Hazelnut 3in1', 'أولد تاون قهوة بيضاء بالبندق 3 في 1', 'OLDTOWN White Coffee Hazelnut 3in1',
   'Nutty and buttery with a fragrant aroma. 15 sticks.', 'بنكهة البندق ورائحة زكية. 15 ظرف.', 'Rasa kacang dan berbutter dengan aroma wangi. 15 paket.', 0.6, 'hazelnut', 20),
  ('OLDTOWN White Coffee 30% Less Sugar 3in1', 'أولد تاون قهوة بيضاء سكر أقل 30% 3 في 1', 'OLDTOWN White Coffee 30% Kurang Gula 3in1',
   'The authentic taste with less sugar. 15 sticks.', 'نفس الطعم الأصلي بسكر أقل. 15 ظرف.', 'Rasa asli dengan kurang gula. 15 paket.', 0.6, 'less-sugar', 30),
  ('OLDTOWN White Coffee Extra Rich 3in1', 'أولد تاون قهوة بيضاء مركّزة 3 في 1', 'OLDTOWN White Coffee Extra Rich 3in1',
   'Full bodied, bold and rich. 15 sticks.', 'قهوة قوية ومركّزة. 15 ظرف.', 'Pekat, kuat dan kaya rasa. 15 paket.', 0.6, 'extra-rich', 40),
  ('OLDTOWN White Coffee Coffee & Creamer 2in1', 'أولد تاون قهوة بيضاء مع كريمر 2 في 1 (بدون سكر)', 'OLDTOWN White Coffee Kopi & Krimer 2in1',
   'Creamy and smooth, no added sugar so you sweeten it your way. 15 sticks.', 'كريمية وناعمة بدون سكر، تحلّيها على كيفك. 15 ظرف.', 'Berkrim dan lembut, tanpa gula tambahan. 15 paket.', 0.55, 'coffee-creamer', 50),
  ('OLDTOWN White Coffee Salted Caramel 3in1', 'أولد تاون قهوة بيضاء بالكراميل المملّح 3 في 1', 'OLDTOWN White Coffee Karamel Masin 3in1',
   'Savoury sweet and indulgent. 15 sticks.', 'حلوة ومالحة بطعم الكراميل. 15 ظرف.', 'Manis masin yang mengasyikkan. 15 paket.', 0.6, 'salted-caramel', 60),
  ('OLDTOWN White Coffee Natural Cane Sugar 3in1', 'أولد تاون قهوة بيضاء بسكر القصب الطبيعي 3 في 1', 'OLDTOWN White Coffee Gula Tebu Asli 3in1',
   'Sweetened with natural cane sugar for a delicate aroma. 15 sticks.', 'محلّاة بسكر القصب الطبيعي برائحة لطيفة. 15 ظرف.', 'Dimaniskan dengan gula tebu asli. 15 paket.', 0.6, 'cane-sugar', 70),
  ('OLDTOWN White Coffee Coconut 3in1', 'أولد تاون قهوة بيضاء بجوز الهند 3 في 1', 'OLDTOWN White Coffee Kelapa 3in1',
   'New flavour with creamy coconut. 13 sticks.', 'نكهة جديدة بجوز الهند الكريمي. 13 ظرف.', 'Perisa baharu dengan kelapa berkrim. 13 paket.', 0.5, 'coconut', 80)
) v(en, ar, ms, den, dar, dms, kg, img, s)
where not exists (select 1 from public.products where brand = 'OLDTOWN');
