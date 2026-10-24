-- Ship Your Cart v3: pay with USDT (TRC20), checked by hand in the admin panel
-- Run once in Supabase → SQL Editor. Safe to re-run.

alter table public.shipments add column if not exists usdt_amount       numeric(12,2);
alter table public.shipments add column if not exists usdt_txid         text;
alter table public.shipments add column if not exists usdt_submitted_at timestamptz;
create unique index if not exists shipments_usdt_txid_key on public.shipments (lower(usdt_txid)) where usdt_txid is not null;

-- the customer sends the transaction ID after paying; an admin then confirms it
create or replace function public.submit_usdt(p_id bigint, p_txid text, p_amount numeric)
returns void language plpgsql security definer set search_path = public as $$
declare t text := lower(trim(p_txid));
begin
  if t !~ '^[0-9a-f]{64}$' then raise exception 'invalid txid'; end if;
  if exists (select 1 from public.shipments where lower(usdt_txid) = t and id <> p_id) then
    raise exception 'txid already used';
  end if;
  update public.shipments
     set usdt_txid = t, usdt_amount = round(p_amount, 2), usdt_submitted_at = now()
   where id = p_id and customer_id = auth.uid() and status = 'quoted';
  if not found then raise exception 'not payable'; end if;
end $$;
revoke all on function public.submit_usdt(bigint, text, numeric) from public, anon;
grant execute on function public.submit_usdt(bigint, text, numeric) to authenticated;
