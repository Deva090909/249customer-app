"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { TRACK_STAGES } from "@/lib/pricing";

export default function HomePage() {
  const supabase = supabaseBrowser();
  const [profile, setProfile] = useState(null);
  const [booking, setBooking] = useState(null);
  const [events, setEvents] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [plan, setPlan] = useState(null);
  const [trackOpen, setTrackOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(prof);

      const { data: bk } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user.id)
        .not("status", "in", "(completed,cancelled)")
        .order("scheduled_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      setBooking(bk);

      if (bk) {
        const { data: ev } = await supabase
          .from("tracking_events")
          .select("*")
          .eq("booking_id", bk.id)
          .order("occurred_at", { ascending: true });
        setEvents(ev || []);
      }

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle();
      setSubscription(sub);
      if (sub) {
        const { data: pl } = await supabase.from("plans").select("*").eq("id", sub.plan_id).single();
        setPlan(pl);
      }
      setLoading(false);
    })();
  }, []);

  const currentStageIdx = events.length ? TRACK_STAGES.findIndex((s) => s.key === events[events.length - 1].stage) : -1;

  if (loading) return <div className="p-6 text-sm text-accent-600">Loading…</div>;

  return (
    <div className="p-4 flex flex-col gap-4">
      <div>
        <p className="text-sm text-accent-600">Good morning,</p>
        <h1 className="text-2xl font-bold text-ink">{profile?.first_name || "there"}</h1>
      </div>

      <Link href="/book" className="btn-primary w-full justify-between px-5 py-4 h-auto text-left">
        <div>
          <div className="font-bold text-base">Book a Wash</div>
          <div className="text-xs opacity-90 font-normal mt-0.5">Doorstep, same washer, before-and-after photo</div>
        </div>
        <span>→</span>
      </Link>

      {plan && subscription && (
        <div className="card">
          <div className="text-[10px] uppercase tracking-wide text-accent-500 font-semibold">Active Plan</div>
          <div className="flex justify-between items-baseline mt-1">
            <div className="font-bold text-lg">{plan.name}</div>
          </div>
          <div className="text-xs text-accent-600 mt-1">
            {subscription.frequency} · renews {subscription.renew_date}
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-accent-600 mb-1">
              <span>{subscription.washes_done} of ~{subscription.expected_total} washes used</span>
              <span>{Math.max(0, subscription.expected_total - subscription.washes_done)} left</span>
            </div>
            <div className="h-1.5 bg-accent-50 rounded-full w-full">
              <div
                className="h-full bg-accent-400 rounded-full"
                style={{ width: `${Math.min(100, Math.round((subscription.washes_done / subscription.expected_total) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {booking && (
        <div>
          <div className="font-bold text-sm mb-2">Upcoming Wash</div>
          <div className="card">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-sm">{booking.booking_ref}</p>
                <p className="text-xs text-accent-600 mt-0.5">
                  {booking.scheduled_date} · {booking.time_slot}
                </p>
              </div>
              <span className="tag border border-accent-400 text-accent-500 text-[11px] px-2.5 py-1 rounded-full capitalize">
                {booking.status.replace("_", " ")}
              </span>
            </div>

            {booking.status !== "unassigned" && (
              <button onClick={() => setTrackOpen(!trackOpen)} className="w-full mt-3 p-3 border border-accent-200 bg-accent-50 rounded-cc flex items-center gap-3 text-left">
                <div className="w-9 h-9 bg-accent-400 text-white rounded-cc flex items-center justify-center text-xs font-bold">
                  {booking.washer_name.split(" ").map((s) => s[0]).join("")}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{booking.washer_name}</p>
                  <p className="text-xs text-accent-600">4.9 ★ · ID verified</p>
                </div>
                <span>{trackOpen ? "▲" : "▼"}</span>
              </button>
            )}

            {trackOpen && (
              <div className="mt-2 border border-accent-100 rounded-cc p-3">
                {TRACK_STAGES.map((st, i) => {
                  const done = i <= currentStageIdx;
                  return (
                    <div key={st.key} className="flex gap-2.5">
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full border-2 mt-1 ${done ? "bg-accent-400 border-accent-500" : "bg-white border-accent-100"}`} />
                        {i < TRACK_STAGES.length - 1 && <div className={`w-0.5 flex-1 min-h-[18px] ${i < currentStageIdx ? "bg-accent-400" : "bg-accent-100"}`} />}
                      </div>
                      <p className={`text-xs pb-3 ${done ? "text-ink font-medium" : "text-accent-600/60"}`}>{st.label}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {!booking && !subscription && (
        <div className="card text-center py-8">
          <p className="text-sm text-accent-600">No upcoming washes yet.</p>
          <Link href="/book" className="btn-secondary mt-3 inline-flex">Book your first wash</Link>
        </div>
      )}
    </div>
  );
}
