-- Ship Your Cart v10: shop categories + cosmetic raw materials.
--  * the minimum order (store_min_items) now applies to coffee only; other categories have no minimum
--  * shop shipping has its own profit % (store_ship_markup_pct). Default 150 = same as the carriers, change it in admin → المتجر
--  * 8 cosmetic raw materials (category 'raw') + 2 hidden ones waiting for a dangerous-goods check
-- Run once in Supabase → SQL Editor (after v9). Safe to re-run. No data is deleted.

insert into public.settings (key, value) values ('store_ship_markup_pct', 150)
  on conflict (key) do nothing;

-- shipping cost before profit (rate card + fuel). Same lookup as price_for.
create or replace function public.price_cost(p_carrier text, p_cc text, p_kg numeric)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare c public.carriers; z text; p numeric; ov numeric; om text; top_kg numeric; top_p numeric;
begin
  if p_kg is null or p_kg <= 0 then return null; end if;
  select * into c from public.carriers where id = p_carrier and active;
  if not found or p_kg > c.max_kg then return null; end if;
  select zone into z from public.carrier_zones where carrier = p_carrier and country_code = upper(p_cc);
  if z is null then return null; end if;
  select price into p from public.carrier_rates
   where carrier = p_carrier and zone = z and max_kg >= p_kg order by max_kg limit 1;
  if p is null then
    select per_kg, mode into ov, om from public.carrier_rates_over
     where carrier = p_carrier and zone = z and from_kg < p_kg order by from_kg desc limit 1;
    if ov is null then return null; end if;
    if om = 'add_half' then
      select max_kg, price into top_kg, top_p from public.carrier_rates
       where carrier = p_carrier and zone = z order by max_kg desc limit 1;
      p := top_p + ceil((p_kg - top_kg) / 0.5) * ov;
    else
      p := ceil(p_kg) * ov;
    end if;
  end if;
  return p * (1 + c.fuel_pct / 100);
end $$;
revoke all on function public.price_cost(text, text, numeric) from public, anon, authenticated;

-- shop shipping price: cost + store_ship_markup_pct (falls back to the normal price if the setting is empty)
create or replace function public.price_store(p_carrier text, p_cc text, p_kg numeric)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare mk numeric; cost numeric;
begin
  select value into mk from public.settings where key = 'store_ship_markup_pct';
  if mk is null then return public.price_for(p_carrier, p_cc, p_kg); end if;
  cost := public.price_cost(p_carrier, p_cc, p_kg);
  if cost is null then return null; end if;
  return ceil(cost * (1 + mk / 100));
end $$;
revoke all on function public.price_store(text, text, numeric) from public, anon, authenticated;

create or replace function public.quote_store(p_cc text, p_kg numeric)
returns table (carrier text, name text, name_ar text, name_ms text, transit_en text, transit_ar text, transit_ms text, price_rm numeric)
language sql stable security definer set search_path = public as $$
  select * from (
    select c.id, c.name, c.name_ar, c.name_ms, c.transit_en, c.transit_ar, c.transit_ms, public.price_store(c.id, p_cc, round(p_kg, 2)) as price_rm
      from public.carriers c where c.active and c.direction = 'export'
  ) q where q.price_rm is not null order by q.price_rm;
$$;
grant execute on function public.quote_store(text, numeric) to anon, authenticated;

-- same as v6, but: minimum applies to coffee only, and shipping uses price_store
create or replace function public.create_store_order(
  p_items jsonb, p_mode text, p_carrier text,
  p_name text, p_phone text, p_address text, p_city text, p_country text, p_cc text, p_note text)
returns bigint language plpgsql security definer set search_path = public as $$
declare it jsonb; pr public.products; q int; total_qty int := 0; coffee_qty int := 0; items_rm numeric := 0; kg numeric := 0;
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
    if pr.category = 'coffee' then coffee_qty := coffee_qty + q; end if;
    items_rm := items_rm + pr.price_rm * q;
    kg := kg + pr.weight_kg * q;
    lines := lines || jsonb_build_object('id', pr.id, 'name', pr.name_en, 'name_ar', pr.name_ar, 'qty', q, 'price', pr.price_rm);
  end loop;
  if total_qty = 0 then raise exception 'empty cart'; end if;
  select value into minq from public.settings where key = 'store_min_items';
  if coffee_qty > 0 and coffee_qty < coalesce(minq, 1) then raise exception 'minimum % coffee bags', coalesce(minq, 1); end if;
  select value into pack from public.settings where key = 'store_pack_kg';
  kg := round(kg + coalesce(pack, 0), 2);

  if p_mode = 'direct' then
    if coalesce(trim(p_name),'') = '' or coalesce(trim(p_address),'') = '' or coalesce(trim(p_cc),'') = '' then
      raise exception 'address required';
    end if;
    select name into cname from public.carriers where id = p_carrier and active;
    ship := public.price_store(p_carrier, p_cc, kg);
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

-- cosmetic raw materials. Prices ≈ 85–95% of the Saudi retail price for the same or smaller size.
-- Supplier costs are in the project notes, not in this table (this table is public).
insert into public.products (category, brand, name_en, name_ar, name_ms, desc_en, desc_ar, desc_ms, price_rm, weight_kg, photo, active, sort)
select 'raw', null, v.en, v.ar, v.ms, v.den, v.dar, v.dms, v.price, v.kg, '/assets/img/products/raw-' || v.img || '.webp', v.act, v.s from (values
  ('Hyaluronic Acid Powder · 10 g', 'هيالورونيك أسيد بودرة · 10 جم', 'Serbuk Asid Hialuronik · 10 g',
   'Pure HA powder for hydrating serums and gels.', 'بودرة هيالورونيك نقية لسيرومات وجل الترطيب.', 'Serbuk HA tulen untuk serum dan gel pelembap.', 62, 0.06, 'hyaluronic', true, 201),
  ('Alpha Arbutin · 10 g', 'ألفا أربوتين · 10 جم', 'Alpha Arbutin · 10 g',
   'Brightening powder for serums and creams.', 'بودرة تفتيح للسيرومات والكريمات.', 'Serbuk pencerah untuk serum dan krim.', 62, 0.06, 'alpha-arbutin', true, 202),
  ('Niacinamide (Vitamin B3) · 50 g', 'نياسيناميد (فيتامين B3) · 50 جم', 'Niacinamide (Vitamin B3) · 50 g',
   'Cosmetic grade powder for toners and serums.', 'بودرة بدرجة تجميلية للتونر والسيروم.', 'Serbuk gred kosmetik untuk toner dan serum.', 45, 0.1, 'niacinamide', true, 203),
  ('Kojic Acid · 50 g', 'حمض الكوجيك · 50 جم', 'Asid Kojik · 50 g',
   'Brightening powder for soaps and creams.', 'بودرة تفتيح للصابون والكريمات.', 'Serbuk pencerah untuk sabun dan krim.', 59, 0.1, 'kojic', true, 204),
  ('Kojic Acid Dipalmitate · 50 g', 'كوجيك أسيد ديبالميتات · 50 جم', 'Kojic Acid Dipalmitate · 50 g',
   'Stable, oil-soluble kojic for creams and lotions.', 'كوجيك ثابت يذوب في الزيت للكريمات واللوشن.', 'Kojik stabil larut minyak untuk krim dan losyen.', 62, 0.1, 'kojic-dipalmitate', true, 205),
  ('L-Ascorbic Acid (Vitamin C) · 50 g', 'فيتامين سي (إل-أسكوربيك) · 50 جم', 'Asid L-Askorbik (Vitamin C) · 50 g',
   'Pure vitamin C powder for fresh serums.', 'بودرة فيتامين سي نقية للسيرومات الطازجة.', 'Serbuk vitamin C tulen untuk serum segar.', 29, 0.1, 'vitamin-c', true, 206),
  ('L-Glutathione Powder · 10 g', 'جلوتاثيون بودرة · 10 جم', 'Serbuk L-Glutathione · 10 g',
   'Reduced glutathione powder for brightening products.', 'بودرة جلوتاثيون لمنتجات التفتيح.', 'Serbuk glutation untuk produk pencerah.', 45, 0.06, 'glutathione', true, 207),
  ('Salicylic Acid (BHA) · 100 g', 'حمض الساليسيليك (BHA) · 100 جم', 'Asid Salisilik (BHA) · 100 g',
   'BHA powder for acne and exfoliating products.', 'بودرة BHA لمنتجات حب الشباب والتقشير.', 'Serbuk BHA untuk produk jerawat dan pengelupasan.', 39, 0.15, 'salicylic', true, 208),
  -- hidden until the carrier confirms they can fly (acids can be dangerous goods)
  ('Glycolic Acid 99% (AHA) · 50 g', 'حمض الجليكوليك 99% (AHA) · 50 جم', 'Asid Glikolik 99% (AHA) · 50 g',
   'AHA crystals for peels and exfoliating toners.', 'كريستال AHA للتقشير والتونر.', 'Kristal AHA untuk pengelupasan dan toner.', 79, 0.1, 'glycolic', false, 209),
  ('Lactic Acid 90% (liquid) · 100 g', 'حمض اللاكتيك 90% (سائل) · 100 جم', 'Asid Laktik 90% (cecair) · 100 g',
   'Gentle AHA for toners and peels.', 'AHA لطيف للتونر والتقشير.', 'AHA lembut untuk toner dan pengelupasan.', 49, 0.15, 'lactic', false, 210)
) as v(en, ar, ms, den, dar, dms, price, kg, img, act, s)
where not exists (select 1 from public.products where category = 'raw');
