-- Ship Your Cart v2: emails + in-site Stripe payment
-- Run once in Supabase → SQL Editor (after schema.sql). Safe to re-run.

-- customer language (for emails) and payment fields
alter table public.customers add column if not exists lang text not null default 'en';
alter table public.shipments add column if not exists paid_at timestamptz;
alter table public.shipments add column if not exists stripe_session_id text;

-- remember which emails were sent, so nothing is sent twice
create table if not exists public.email_log (
  key     text primary key,
  sent_at timestamptz not null default now()
);
alter table public.email_log enable row level security;  -- no policies: only the server can use it

-- language from the sign-up form
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.customers (id, email, full_name, whatsapp, country, lang)
  values (new.id, lower(new.email),
          coalesce(new.raw_user_meta_data ->> 'full_name', ''),
          coalesce(new.raw_user_meta_data ->> 'whatsapp', ''),
          coalesce(new.raw_user_meta_data ->> 'country', ''),
          coalesce(nullif(new.raw_user_meta_data ->> 'lang', ''), 'en'))
  on conflict (id) do nothing;
  return new;
end $$;

-- call the "notify" Edge Function when something happens
create extension if not exists pg_net;

create or replace function public.call_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if new.status is not distinct from old.status then return new; end if;
  end if;
  begin
    perform net.http_post(
      url := 'https://lmwpilpcuxyzpygylclq.supabase.co/functions/v1/notify',
      body := jsonb_build_object('table', tg_table_name, 'id', new.id),
      headers := '{"Content-Type":"application/json"}'::jsonb
    );
  exception when others then
    raise warning 'notify call failed: %', sqlerrm;  -- never block sign-ups or saves
  end;
  return new;
end $$;

drop trigger if exists notify_customer on public.customers;
create trigger notify_customer after insert on public.customers
  for each row execute function public.call_notify();
drop trigger if exists notify_parcel on public.parcels;
create trigger notify_parcel after insert on public.parcels
  for each row execute function public.call_notify();
drop trigger if exists notify_shipment on public.shipments;
create trigger notify_shipment after insert or update of status on public.shipments
  for each row execute function public.call_notify();
