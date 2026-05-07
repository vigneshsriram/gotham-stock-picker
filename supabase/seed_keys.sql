-- Run this in the Supabase SQL Editor

-- Seed the key pool
insert into av_keys (key) values
  ('LCYQBEYU4TUYTABL'),
  ('TUIRKM24CU5ZNAV8'),
  ('Q5QHAWSL9OC8FZQY'),
  ('9YSAE4CFJ99F7KNI'),
  ('6EMJLS7ICT39RXFZ'),
  ('HSYXC3CRQCSQSGUZ'),
  ('2RZPMK27YQYURRJ5'),
  ('F5ILBT2PLTCVOZWS'),
  ('KX61ME1DV7IPV856'),
  ('OVE521KKO4EG0QA3'),
  ('X1F21ODBKXA6LO6U')
on conflict do nothing;

-- RPC: atomically pick the least-used key, reset daily counts if needed
create or replace function pick_av_key()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_key text;
begin
  -- Reset daily counts for any key that hasn't been reset today
  update av_keys
  set uses_today = 0, last_reset = current_date
  where last_reset < current_date;

  -- Pick the key with fewest uses today (skip locked to handle concurrent calls)
  select key into chosen_key
  from av_keys
  order by uses_today asc, random()
  limit 1
  for update skip locked;

  if chosen_key is null then
    -- All keys locked momentarily, just pick any
    select key into chosen_key from av_keys order by uses_today asc limit 1;
  end if;

  -- Increment usage counter
  update av_keys set uses_today = uses_today + 1 where key = chosen_key;

  return chosen_key;
end;
$$;

-- Allow authenticated users to call this RPC
grant execute on function pick_av_key() to authenticated;

-- RLS: only admin can see the keys table directly; RPC handles access for others
alter table av_keys enable row level security;
create policy "Admin only" on av_keys for all using (
  (select email from auth.users where id = auth.uid()) =
  current_setting('app.admin_email', true)
);
