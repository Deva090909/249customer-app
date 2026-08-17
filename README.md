# CleanCar Customer App

A real Next.js 14 app (App Router) backing the CleanCar prototype with a live
Supabase database: auth, vehicles, bookings, live tracking, subscriptions,
ratings, and referrals.

## 1. Create the Supabase backend

1. Go to https://supabase.com/dashboard → **New project**.
2. Once it's created, open **SQL Editor** → paste the entire contents of
   `supabase/schema.sql` → **Run**. This creates every table, the RLS
   policies, and seeds the wash plans / add-ons / coupons.
3. Go to **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. (Optional but recommended) Under **Authentication → Providers**, turn off
   "Confirm email" while testing so signups log straight in, or leave it on
   for production.

## 2. Run it locally

```bash
cp .env.example .env.local
# paste your two Supabase values into .env.local
npm install
npm run dev
```

Visit http://localhost:3000 — sign up, add a vehicle, book a wash. Every
action writes to your real Supabase tables (`vehicles`, `bookings`,
`tracking_events`, `subscriptions`, `ratings`).

## 3. Push to a new GitHub repo

```bash
cd cleancar
git init
git add .
git commit -m "CleanCar customer app"
gh repo create cleancar-customer --private --source=. --push
# no gh CLI? create an empty repo on github.com, then:
# git remote add origin https://github.com/YOUR-USERNAME/cleancar-customer.git
# git branch -M main
# git push -u origin main
```

## 4. Deploy on Vercel

1. https://vercel.com/new → **Import** your new `cleancar-customer` repo.
2. Framework preset: Next.js (auto-detected).
3. Add the two environment variables from step 1 (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) under **Settings → Environment
   Variables**.
4. Deploy. Every push to `main` redeploys automatically.

## What's wired to real data vs. simplified

Fully real (reads/writes Supabase): auth & sessions, vehicles, plan/add-on
catalog, booking creation + pricing, live tracking timeline
(`tracking_events`), subscriptions, wash history, ratings, referral code,
address on profile.

Simplified from the original prototype (kept out to stay shippable): the
in-app AI chat assistant, dispute/refund/reschedule modals, callback
requests, and push notifications. These are straightforward to add as
additional tables + pages following the same pattern as `bookings` —happy to
build any of them out next.

To simulate a washer's progress for testing, insert rows into
`tracking_events` for a booking (`washer_assigned` → `on_the_way` →
`arrived` → `wash_complete`) — the Home screen's tracking timeline reads
directly off this table.
