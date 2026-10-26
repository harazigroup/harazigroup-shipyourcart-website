-- Ship Your Cart v9: lower profit cap for heavy shipments (default: above 10 kg, at most 100%).
-- Run once in Supabase → SQL Editor (after v8). Safe to re-run. Change the numbers in the admin panel → الأسعار.

insert into public.settings (key, value) values ('heavy_from_kg', 10), ('heavy_markup_pct', 100)
  on conflict (key) do nothing;

create or replace function public.price_for(p_carrier text, p_cc text, p_kg numeric)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare c public.carriers; z text; p numeric; ov numeric; om text; top_kg numeric; top_p numeric; mk numeric; hv_kg numeric; hv_mk numeric;
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
  mk := c.markup_pct;
  select value into hv_kg from public.settings where key = 'heavy_from_kg';
  select value into hv_mk from public.settings where key = 'heavy_markup_pct';
  if hv_kg is not null and hv_mk is not null and p_kg > hv_kg and hv_mk < mk then
    -- capped profit, but never cheaper than the price at the threshold weight
    return greatest(ceil(p * (1 + c.fuel_pct / 100) * (1 + hv_mk / 100)), public.price_for(p_carrier, p_cc, hv_kg));
  end if;
  return ceil(p * (1 + c.fuel_pct / 100) * (1 + mk / 100));
end $$;
revoke all on function public.price_for(text, text, numeric) from public, anon, authenticated;
