"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function AccountPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [address, setAddress] = useState({ line1: "", area: "", pin: "" });

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(data);
    setAddress({ line1: data.address_line1 || "", area: data.address_area || "", pin: data.address_pin || "" });
  }
  useEffect(() => { load(); }, []);

  async function saveAddress() {
    await supabase.from("profiles").update({
      address_line1: address.line1,
      address_area: address.area,
      address_pin: address.pin,
    }).eq("id", profile.id);
    setEditing(false);
    load();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/home");
    router.refresh();
  }

  if (!profile) return <div className="p-6 text-sm text-accent-600">Loading…</div>;

  return (
    <div className="p-4 flex flex-col gap-3">
      <h1 className="font-bold text-xl">Account &amp; Support</h1>

      <div className="card">
        <p className="text-[10px] uppercase tracking-wide text-accent-500 font-semibold mb-1">Profile</p>
        <p className="text-base font-semibold">{profile.first_name} {profile.last_name}</p>
        <p className="text-sm text-accent-600 mt-1">{profile.phone} · {profile.email}</p>
      </div>

      <div className="card">
        <div className="flex justify-between items-center">
          <p className="text-[10px] uppercase tracking-wide text-accent-500 font-semibold">Saved Address</p>
          <button onClick={() => setEditing(!editing)} className="text-xs text-accent-500">{editing ? "Cancel" : "Edit"}</button>
        </div>
        {editing ? (
          <div className="flex flex-col gap-2 mt-2">
            <input className="input" placeholder="Address line" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Area" value={address.area} onChange={(e) => setAddress({ ...address, area: e.target.value })} />
              <input className="input" placeholder="Pin code" value={address.pin} onChange={(e) => setAddress({ ...address, pin: e.target.value })} />
            </div>
            <button className="btn-primary" onClick={saveAddress}>Save Address</button>
          </div>
        ) : (
          <p className="text-sm mt-2">{address.line1 ? `${address.line1}, ${address.area} ${address.pin}` : "No address saved yet."}</p>
        )}
      </div>

      <div className="card">
        <p className="text-[10px] uppercase tracking-wide text-accent-500 font-semibold mb-1">Referral Code</p>
        <p className="font-bold text-lg tracking-wide">{profile.referral_code}</p>
        <p className="text-xs text-accent-600 mt-1">Share it — when a friend subscribes, you both win.</p>
      </div>

      <button onClick={logout} className="btn-ghost w-full text-accent-600">Log Out</button>
    </div>
  );
}