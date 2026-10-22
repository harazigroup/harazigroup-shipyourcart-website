-- Ship Your Cart: customer accounts, parcels and shipments
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- Safe to re-run: it creates what is missing and replaces functions/policies.

-- 1. Customer codes: SYC-10001, SYC-10002, ...
create sequence if not exists public.customer_code_seq start 10001;

create table if not exists public.customers (
  id            uuid primary key references auth.users(id) on delete cascade,
  code          text unique not null default ('SYC-' || nextval('public.customer_code_seq')),
  email         text,
  full_name     text not null default '',
  whatsapp      text not null default '',
  country       text not null default '',
  ship_name     text, ship_phone text, ship_address text, ship_city text, ship_country text,
  admin_note    text,
  created_at    timestamptz not null default now()
);

create table if not exists public.admins (
  email text primary key   -- lowercase email of a team member
);

create table if not exists public.shipments (
  id            bigint generated always as identity primary key,
  customer_id   uuid not null references public.customers(id) on delete cascade,
  status        text not null default 'requested'
                check (status in ('requested','quoted','paid','shipped','delivered','cancelled')),
  method        text not null default 'air' check (method in ('air','sea','land','express')),
  ship_name     text, ship_phone text, ship_address text, ship_city text, ship_country text,
  weight_kg     numeric(8,2),
  price_rm      numeric(10,2),
  payment_link  text,
  carrier       text, tracking_no text, tracking_url text,
  customer_note text, admin_note text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.parcels (
  id            bigint generated always as identity primary key,
  customer_id   uuid not null references public.customers(id) on delete cascade,
  shipment_id   bigint references public.shipments(id) on delete set null,
  store         text, tracking_in text, description text,
  weight_kg     numeric(8,2),
  length_cm     numeric(6,1), width_cm numeric(6,1), height_cm numeric(6,1),
  photos        text[] not null default '{}',
  status        text not null default 'received'
                check (status in ('received','in_shipment','shipped','on_hold','returned')),
  admin_note    text,
  received_at   timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index if not exists parcels_customer_idx on public.parcels(customer_id);
create index if not exists shipments_customer_idx on public.shipments(customer_id);

-- 2. Helpers
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- New sign-up → customer row with the next code
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.customers (id, email, full_name, whatsapp, country)
  values (new.id, lower(new.email),
          coalesce(new.raw_user_meta_data ->> 'full_name', ''),
          coalesce(new.raw_user_meta_data ->> 'whatsapp', ''),
          coalesce(new.raw_user_meta_data ->> 'country', ''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Customers can edit their own profile, but never their code, email or the team note
create or replace function public.protect_customer_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.code := old.code; new.email := old.email; new.admin_note := old.admin_note; new.id := old.id;
  end if;
  return new;
end $$;
drop trigger if exists protect_customer_fields on public.customers;
create trigger protect_customer_fields before update on public.customers
  for each row execute function public.protect_customer_fields();

-- Keep parcels in step with their shipment
create or replace function public.sync_parcels() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if new.status in ('shipped','delivered') and old.status is distinct from new.status then
    update public.parcels set status = 'shipped' where shipment_id = new.id;
  elsif new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update public.parcels set status = 'received', shipment_id = null where shipment_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists sync_parcels on public.shipments;
create trigger sync_parcels before update on public.shipments
  for each row execute function public.sync_parcels();

-- Customer asks us to consolidate and ship selected parcels
create or replace function public.request_shipment(
  p_parcels bigint[], p_method text, p_name text, p_phone text,
  p_address text, p_city text, p_country text, p_note text)
returns bigint language plpgsql security definer set search_path = public as $$
declare sid bigint; n int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select count(*) into n from public.parcels
   where id = any(p_parcels) and customer_id = auth.uid() and status = 'received' and shipment_id is null;
  if n = 0 or n <> coalesce(array_length(p_parcels, 1), 0) then raise exception 'invalid parcels'; end if;
  if coalesce(trim(p_name),'') = '' or coalesce(trim(p_address),'') = '' or coalesce(trim(p_country),'') = '' then
    raise exception 'address required';
  end if;
  insert into public.shipments (customer_id, method, ship_name, ship_phone, ship_address, ship_city, ship_country, customer_note, weight_kg)
  values (auth.uid(), coalesce(nullif(p_method, ''), 'air'), p_name, p_phone, p_address, p_city, p_country, p_note,
          (select sum(weight_kg) from public.parcels where id = any(p_parcels)))
  returning id into sid;
  update public.parcels set shipment_id = sid, status = 'in_shipment' where id = any(p_parcels);
  update public.customers set ship_name = p_name, ship_phone = p_phone, ship_address = p_address,
         ship_city = p_city, ship_country = p_country where id = auth.uid();
  return sid;
end $$;
grant execute on function public.request_shipment(bigint[], text, text, text, text, text, text, text) to authenticated;

-- Customer cancels a request we have not priced yet
create or replace function public.cancel_shipment(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.shipments set status = 'cancelled'
   where id = p_id and customer_id = auth.uid() and status = 'requested';
  if not found then raise exception 'cannot cancel'; end if;
end $$;
grant execute on function public.cancel_shipment(bigint) to authenticated;

-- 3. Row-level security: customers see only their own rows, admins see everything
alter table public.customers enable row level security;
alter table public.parcels   enable row level security;
alter table public.shipments enable row level security;
alter table public.admins    enable row level security;

drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers for select to authenticated
  using (id = auth.uid() or public.is_admin());
drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
drop policy if exists customers_admin_delete on public.customers;
create policy customers_admin_delete on public.customers for delete to authenticated using (public.is_admin());

drop policy if exists parcels_select on public.parcels;
create policy parcels_select on public.parcels for select to authenticated
  using (customer_id = auth.uid() or public.is_admin());
drop policy if exists parcels_admin_write on public.parcels;
create policy parcels_admin_write on public.parcels for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists shipments_select on public.shipments;
create policy shipments_select on public.shipments for select to authenticated
  using (customer_id = auth.uid() or public.is_admin());
drop policy if exists shipments_admin_write on public.shipments;
create policy shipments_admin_write on public.shipments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists admins_self on public.admins;
create policy admins_self on public.admins for select to authenticated using (public.is_admin());

-- 4. Parcel photos (private bucket; folder = customer id)
insert into storage.buckets (id, name, public) values ('parcel-photos', 'parcel-photos', false)
on conflict (id) do nothing;

drop policy if exists "parcel photos admin" on storage.objects;
create policy "parcel photos admin" on storage.objects for all to authenticated
  using (bucket_id = 'parcel-photos' and public.is_admin())
  with check (bucket_id = 'parcel-photos' and public.is_admin());
drop policy if exists "parcel photos owner read" on storage.objects;
create policy "parcel photos owner read" on storage.objects for select to authenticated
  using (bucket_id = 'parcel-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- 5. Add yourself as admin (replace the email, lowercase), then run this line:
-- insert into public.admins (email) values ('you@example.com');
