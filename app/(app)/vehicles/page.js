"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { detectCategory } from "@/lib/pricing";

export default function VehiclesPage() {
  const supabase = supabaseBrowser();
  const [vehicles, setVehicles] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ brand: "", reg: "", color: "" });
  const [userId, setUserId] = useState(null);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user.id);
    const { data } = await supabase.from("vehicles").select("*").eq("user_id", user.id).order("created_at");
    setVehicles(data || []);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.brand || !form.reg) return;
    const cat = detectCategory(form.brand) || "Hatchback / Compact Sedan";
    await supabase.from("vehicles").insert({ user_id: userId, brand: form.brand, reg_number: form.reg, color: form.color, category: cat });
    setForm({ brand: "", reg: "", color: "" });
    setAdding(false);
    load();
  }

  async function remove(id) {
    await supabase.from("vehicles").delete().eq("id", id);
    load();
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      <h1 className="font-bold text-xl">My Vehicles</h1>
      {vehicles.map((v) => (
        <div key={v.id} className="card flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold">{v.brand} · {v.color}</p>
            <p className="text-xs text-accent-600">{v.reg_number} · {v.category}</p>
          </div>
          <button onClick={() => remove(v.id)} className="text-xs text-red-500">Remove</button>
        </div>
      ))}

      {adding ? (
        <div className="card flex flex-col gap-2">
          <input className="input" placeholder="Brand / model" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          <input className="input" placeholder="Registration number" value={form.reg} onChange={(e) => setForm({ ...form, reg: e.target.value })} />
          <input className="input" placeholder="Color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          <button className="btn-primary" onClick={save}>Save Vehicle</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="p-3 border border-dashed border-accent-300 rounded-cc text-sm text-accent-600">
          + Add a Vehicle
        </button>
      )}
    </div>
  );
}
