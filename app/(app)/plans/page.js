"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function PlansPage() {
  const supabase = supabaseBrowser();
  const [sub, setSub] = useState(null);
  const [plan, setPlan] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("subscriptions").select("*").eq("user_id", user.id).eq("active", true).maybeSingle();
    setSub(data);
    if (data) {
      const { data: pl } = await supabase.from("plans").select("*").eq("id", data.plan_id).single();
      setPlan(pl);
    }
  }
  useEffect(() => { load(); }, []);

  async function cancel() {
    await supabase.from("subscriptions").update({ active: false }).eq("id", sub.id);
    setConfirmOpen(false);
    load();
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <h1 className="font-bold text-xl">My Plans</h1>
      {sub && plan ? (
        <div className="card">
          <div className="text-[10px] uppercase tracking-wide text-accent-500 font-semibold">Active</div>
          <div className="font-bold text-lg">{plan.name}</div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
            <div><p className="text-accent-500 text-xs">Started</p><p className="font-semibold">{sub.start_date}</p></div>
            <div><p className="text-accent-500 text-xs">Renews</p><p className="font-semibold">{sub.renew_date}</p></div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-accent-600 mb-1">
              <span>{sub.washes_done} of ~{sub.expected_total} washes used</span>
              <span>{Math.max(0, sub.expected_total - sub.washes_done)} left</span>
            </div>
            <div className="h-1.5 bg-accent-50 rounded-full w-full">
              <div className="h-full bg-accent-400 rounded-full" style={{ width: `${Math.min(100, Math.round((sub.washes_done / sub.expected_total) * 100))}%` }} />
            </div>
          </div>
          <button onClick={() => setConfirmOpen(true)} className="btn-ghost w-full mt-4 text-sm">Cancel Subscription</button>
        </div>
      ) : (
        <div className="card text-center py-8">
          <p className="text-sm text-accent-600">No active plan yet.</p>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-5 z-50">
          <div className="card w-full max-w-[380px]">
            <p className="font-bold text-base mb-1">Cancel your subscription?</p>
            <p className="text-sm text-accent-600 mb-4">This ends your plan immediately. Unused washes can be refunded on request.</p>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => setConfirmOpen(false)}>Keep Plan</button>
              <button className="btn-primary flex-1" onClick={cancel}>Cancel Plan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
