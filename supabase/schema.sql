-- ============================================================================
-- CleanCar — Supabase schema (run once in SQL editor, or via `supabase db push`)
-- Covers: auth-linked profiles, vehicles, plans/addons/coupons catalog,
-- bookings (one-time + subscription), live tracking events, subscriptions,
-- ratings, referrals. RLS locks every user table to its owner.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------- PROFILES (1:1 with auth.users) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  phone text default '',
  email text default '',
  address_line1 text default '',
  address_area text default '',
  address_pin text default '',
  referral_code text unique default upper(substr(md5(random()::text), 1, 8)),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "profiles: owner read" on profiles for select using (auth.uid() = id);
create policy "profiles: owner update" on profiles for update using (auth.uid() = id);
create policy "profiles: owner insert" on profiles for insert with check (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ---------- VEHICLES ----------
create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand text not null,
  color text default '',
  reg_number text not null,
  category text not null check (category in ('Hatchback / Compact Sedan','SUV / MUV / Sedan','Luxury / Large SUV')),
  created_at timestamptz not null default now()
);
alter table vehicles enable row level security;
create policy "vehicles: owner all" on vehicles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- CATALOG: PLANS / ADD-ONS / COUPONS (public read, admin write) ----------
create table if not exists plans (
  id text primary key,               -- e.g. EXPRESS_WASH, BASIC
  kind text not null check (kind in ('subscription','onetime')),
  name text not null,
  tagline text default '',
  rating numeric default 4.7,
  reviews int default 0,
  recommended boolean default false,
  included jsonb not null default '[]',
  periodic jsonb not null default '[]',
  price_hatch int not null,
  price_suv int not null,
  price_lux int not null
);
alter table plans enable row level security;
create policy "plans: public read" on plans for select using (true);

create table if not exists addons (
  id text primary key,
  name text not null,
  description text default '',
  price_hatch int not null,
  price_suv int not null,
  price_lux int not null
);
alter table addons enable row level security;
create policy "addons: public read" on addons for select using (true);

create table if not exists coupons (
  code text primary key,
  discount int default 0,
  pct int default 0,
  active boolean default true
);
alter table coupons enable row level security;
create policy "coupons: public read" on coupons for select using (active = true);

-- ---------- SUBSCRIPTIONS ----------
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid references vehicles(id) on delete set null,
  plan_id text not null references plans(id),
  frequency text default 'Daily',
  start_date date not null default current_date,
  renew_date date not null,
  washes_done int not null default 0,
  expected_total int not null default 30,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table subscriptions enable row level security;
create policy "subscriptions: owner all" on subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- BOOKINGS ----------
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid references vehicles(id) on delete set null,
  service_type text not null check (service_type in ('onetime','subscription')),
  plan_id text references plans(id),
  addon_ids jsonb not null default '[]',
  scheduled_date date not null,
  time_slot text not null,
  address_line1 text default '',
  address_area text default '',
  address_pin text default '',
  payment_method text default 'doorstep' check (payment_method in ('doorstep','online')),
  coupon_code text,
  subtotal int not null default 0,
  discount int not null default 0,
  total int not null default 0,
  status text not null default 'unassigned'
    check (status in ('unassigned','assigned','in_progress','completed','cancelled')),
  washer_name text default 'Rajesh Patel',
  reschedule_count int not null default 0,
  booking_ref text unique not null default ('CC' || to_char(now(), 'YYMMDDHH24MISS')),
  created_at timestamptz not null default now()
);
alter table bookings enable row level security;
create policy "bookings: owner all" on bookings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- LIVE TRACKING EVENTS (drives the tracking timeline) ----------
create table if not exists tracking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  stage text not null check (stage in ('booking_confirmed','washer_assigned','on_the_way','arrived','wash_complete')),
  occurred_at timestamptz not null default now()
);
alter table tracking_events enable row level security;
create policy "tracking: owner read" on tracking_events for select using (
  exists (select 1 from bookings b where b.id = tracking_events.booking_id and b.user_id = auth.uid())
);
create policy "tracking: owner insert" on tracking_events for insert with check (
  exists (select 1 from bookings b where b.id = tracking_events.booking_id and b.user_id = auth.uid())
);

-- ---------- RATINGS ----------
create table if not exists ratings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  quality int check (quality between 1 and 5),
  punctuality int check (punctuality between 1 and 5),
  professionalism int check (professionalism between 1 and 5),
  cleanliness int check (cleanliness between 1 and 5),
  overall int generated always as (
    round((coalesce(quality,0)+coalesce(punctuality,0)+coalesce(professionalism,0)+coalesce(cleanliness,0)) / 4.0)
  ) stored,
  comment text default '',
  nps int,
  created_at timestamptz not null default now(),
  unique(booking_id)
);
alter table ratings enable row level security;
create policy "ratings: owner all" on ratings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- SEED DATA: plans, add-ons, a starter coupon ----------
insert into plans (id, kind, name, tagline, rating, reviews, recommended, included, periodic, price_hatch, price_suv, price_lux) values
('EXPRESS_WASH','subscription','Express Wash','Your car, clean every morning.',4.6,312,false,
  '["Full exterior water spray + microfibre dry — daily","Same named washer every morning","Before/after WhatsApp photo — daily","All 4 tyres rinsed + rim wiped — weekly"]',
  '["Underbody flush — monthly","Windshield clean (outside) — monthly","Shampoo wash — monthly"]', 1249, 1499, 1999),
('SMART_WASH','subscription','Smart Wash','Clean daily. Protected always.',4.8,890,true,
  '["Everything in Express Wash","Same named washer every morning","Weekly tyre & rim spray-clean"]',
  '["Interior vacuum & mat clean — fortnightly","Shampoo wash — fortnightly","Car fragrance — monthly","Tyre dressing & shine coat — monthly"]', 1599, 1999, 2699),
('ELITE_WASH','subscription','Elite Wash','Showroom condition, every day.',4.9,145,false,
  '["Everything in Smart Wash","Same named washer every morning","Weekly tyre & rim spray-clean"]',
  '["Shampoo wash — weekly","Dashboard & console deep clean — fortnightly","Full hand wax polish — monthly","Engine bay dry blow — monthly","Premium fragrance + cabin sanitisation — monthly"]', 1999, 2499, 3499),
('BASIC','onetime','Basic Wash','Quick exterior wash & dry.',4.5,480,false,
  '["Full exterior water spray + microfibre dry","All 4 tyres rinsed + rim wiped"]', '[]', 199, 299, 399),
('PREMIUM','onetime','Premium Wash','Exterior + shampoo shine.',4.7,260,false,
  '["Everything in Basic Wash","Shampoo wash","Dashboard wipe-down"]', '[]', 299, 349, 499),
('DELUXE','onetime','Deluxe Wash','The full detail treatment.',4.8,140,false,
  '["Everything in Premium Wash","Interior vacuum","Tyre dressing","Hand wax polish"]', '[]', 399, 499, 699)
on conflict (id) do nothing;

insert into addons (id, name, description, price_hatch, price_suv, price_lux) values
('vacuum','Interior Deep Vacuum','Seats, mats, foot wells, boot — with before/after photo.',199,249,349),
('dash','Dashboard & Console Detail','Dashboard polish, console clean, vents blown out.',149,199,249),
('tyre','Tyre Dressing (all 4)','Shampoo wash + shine protect on every sidewall.',99,149,199),
('wax','Full Hand Wax Polish','Panel-by-panel hand wax, outer body only.',199,249,399),
('underbody','Underbody Wash','Removes road grime from the undercarriage.',199,249,349),
('engine','Engine Bay Wipe-Down','Dry blow only — no water near the engine.',99,149,199),
('fragrance','Car Fragrance','Fresh interior fragrance, single application.',49,49,49)
on conflict (id) do nothing;

insert into coupons (code, discount, pct) values
('WELCOME150', 150, 0),
('CLEANCAR10', 0, 10)
on conflict (code) do nothing;
