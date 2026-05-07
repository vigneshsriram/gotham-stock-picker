-- Run this in the Supabase SQL Editor to set up the database

-- Profiles table (mirrors auth.users, populated via trigger)
create table if not exists profiles (
  id         uuid references auth.users on delete cascade primary key,
  email      text,
  created_at timestamptz default now()
);

-- Trigger: auto-create profile on user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- RLS for profiles
alter table profiles enable row level security;

-- Admin (identified by email env var set in the edge function) can read all
-- Regular users can only read their own row
create policy "Users see own profile" on profiles
  for select using (auth.uid() = id);

-- For admin panel: allow select on all rows for users whose email is admin email
-- (Edge function handles deletion; frontend just reads profiles)
create policy "Admin reads all profiles" on profiles
  for select using (
    (select email from auth.users where id = auth.uid()) = current_setting('app.admin_email', true)
  );

-- User settings (one row per user: stores their AV API key)
create table if not exists user_settings (
  user_id uuid references auth.users on delete cascade primary key,
  av_key  text
);

alter table user_settings enable row level security;

create policy "Users manage own settings" on user_settings
  for all using (auth.uid() = user_id);

-- Watchlist (many rows per user)
create table if not exists watchlist (
  id       uuid default gen_random_uuid() primary key,
  user_id  uuid references auth.users on delete cascade not null,
  ticker   text not null,
  added_at timestamptz default now(),
  unique (user_id, ticker)
);

alter table watchlist enable row level security;

create policy "Users manage own watchlist" on watchlist
  for all using (auth.uid() = user_id);
