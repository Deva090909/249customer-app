"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function HistoryPage() {
  const supabase = supabaseBrowser();
  const [jobs, setJobs] = useState([]);
  const [ratings, setRatings] = useState({});
  const [ratingBookingId, setRatingBookingId] = useState(null);
  const [stars, setStars] = useState({ quality: 0, punctuality: 0, professionalism: 0, cleanliness: 0 });
  const [userId, setUserId] = useState(null);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user.id);
    const { data } = await supabase.from("bookings").select("*").eq("user_id", user.id).order("scheduled_date", { ascending: false });
    setJobs(data || []);
    const { data: r } = await supabase.from("ratings").select("*").eq("user_id", user.id);
    const map = {};
    (r || []).forEach((x) => (map[x.booking_id] = x));
    setRatings(map);
  }
  useEffect(() => { load(); }, []);

  async function submitRating() {
    const vals = Object.values(stars);
    if (vals.some((v) => !v)) return;
    await supabase.from("ratings").insert({ booking_id: ratingBookingId, user_id: userId, ...stars });
    setRatingBookingId(null);
    setStars({ quality: 0, punctuality: 0, professionalism: 0, cleanliness: 0 });
    load();
  }

  const DIMS = [
    ["quality", "Wash quality"],
    ["punctuality", "Punctuality"],
    ["professionalism", "Professionalism"],
    ["cleanliness", "Tidiness"],
  ];

  return (
    <div className="p-4 flex flex-col gap-3">
      <h1 className="font-bold text-xl">Wash History</h1>
      {jobs.length === 0 && <p className="text-sm text-accent-600">No washes yet.</p>}
      {jobs.map((j) => {
        const rating = ratings[j.id];
        return (
          <div key={j.id} className="card">
            <div className="flex justify-between">
              <div>
                <p className="text-sm font-semibold">{j.booking_ref}</p>
                <p className="text-xs text-accent-600 mt-0.5">{j.scheduled_date}</p>
              </div>
              <span className="text-[11px] border border-accent-200 text-accent-600 px-2.5 py-1 rounded-full capitalize h-fit">{j.status.replace("_", " ")}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm font-semibold">₹{j.total}</span>
              {rating ? (
                <span className="text-brandYellow text-sm">{"★".repeat(rating.overall)}{"☆".repeat(5 - rating.overall)}</span>
              ) : j.status === "completed" ? (
                <button className="btn-secondary text-xs" onClick={() => setRatingBookingId(j.id)}>Rate this wash</button>
              ) : null}
            </div>
          </div>
        );
      })}

      {ratingBookingId && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50">
          <div className="card w-full rounded-b-none">
            <p className="font-bold text-lg mb-3">How was your wash?</p>
            {DIMS.map(([key, label]) => (
              <div key={key} className="flex justify-between items-center mb-3">
                <p className="text-sm font-medium">{label}</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setStars({ ...stars, [key]: n })} className={`text-2xl ${n <= stars[key] ? "text-brandYellow" : "text-accent-100"}`}>★</button>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <button className="btn-secondary flex-1" onClick={() => setRatingBookingId(null)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={submitRating}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
