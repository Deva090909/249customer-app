"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { detectCategory, tierFor, priceForTier, TIME_SLOTS } from "@/lib/pricing";

export default function BookPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1);

  const [vehicles, setVehicles] = useState([]);
  const [plans, setPlans] = useState([]);
  const [addons, setAddons] = useState([]);

  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [newVehicle, setNewVehicle] = useState({ brand: "", color: "", reg: "" });
  const [addingNew, setAddingNew] = useState(false);
  const [serviceType, setServiceType] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [address, setAddress] = useState({ line1: "", area: "", pin: "" });
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("doorstep");
  const [confirming, setConfirming] = useState(false);
  const [bookingRef, setBookingRef] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (!user) return;
      const { data: veh } = await supabase.from("vehicles").select("*").eq("user_id", user.id);
      setVehicles(veh || []);
      if (!veh || veh.length === 0) setAddingNew(true);
      const { data: pl } = await supabase.from("plans").select("*");
      setPlans(pl || []);
      const { data: ad } = await supabase.from("addons").select("*");
      setAddons(ad || []);
      const tmr = new Date();
      tmr.setDate(tmr.getDate() + 1);
      setScheduledDate(tmr.toISOString().split("T")[0]);
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (prof) setAddress({ line1: prof.address_line1 || "", area: prof.address_area || "", pin: prof.address_pin || "" });
    })();
  }, []);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const category = addingNew ? detectCategory(newVehicle.brand) : selectedVehicle?.category || "";
  const tier = tierFor(category);

  const plansForType = plans.filter((p) => p.kind === (serviceType === "onetime" ? "onetime" : "subscription"));
  const chosenPlan = plans.find((p) => p.id === selectedPlan);
  const planPrice = chosenPlan ? priceForTier(chosenPlan, tier) : 0;
  const addonsTotal = selectedAddons.reduce((sum, id) => {
    const a = addons.find((x) => x.id === id);
    return sum + (a ? priceForTier(a, tier) : 0);
  }, 0);
  const subtotal = planPrice + addonsTotal;
  const discount = appliedCoupon ? appliedCoupon.discount || Math.round(subtotal * (appliedCoupon.pct || 0) / 100) : 0;
  const total = Math.max(0, subtotal - discount);

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    const { data } = await supabase.from("coupons").select("*").eq("code", code).eq("active", true).maybeSingle();
    if (data) setAppliedCoupon(data);
    else setError("That code isn't valid or has expired.");
  }

  async function confirmBooking() {
    setConfirming(true);
    setError("");
    try {
      let vehicleId = selectedVehicleId;
      if (addingNew) {
        const cat = detectCategory(newVehicle.brand) || "Hatchback / Compact Sedan";
        const { data: v, error: vErr } = await supabase
          .from("vehicles")
          .insert({ user_id: user.id, brand: newVehicle.brand, color: newVehicle.color, reg_number: newVehicle.reg, category: cat })
          .select()
          .single();
        if (vErr) throw vErr;
        vehicleId = v.id;
      }

      const { data: bk, error: bErr } = await supabase
        .from("bookings")
        .insert({
          user_id: user.id,
          vehicle_id: vehicleId,
          service_type: serviceType,
          plan_id: selectedPlan,
          addon_ids: selectedAddons,
          scheduled_date: scheduledDate,
          time_slot: timeSlot,
          address_line1: address.line1,
          address_area: address.area,
          address_pin: address.pin,
          payment_method: paymentMethod,
          coupon_code: appliedCoupon?.code || null,
          subtotal,
          discount,
          total,
          status: "unassigned",
        })
        .select()
        .single();
      if (bErr) throw bErr;

      await supabase.from("tracking_events").insert({ booking_id: bk.id, stage: "booking_confirmed" });

      if (serviceType === "subscription") {
        const renew = new Date();
        renew.setDate(renew.getDate() + 30);
        await supabase.from("subscriptions").insert({
          user_id: user.id,
          vehicle_id: vehicleId,
          plan_id: selectedPlan,
          frequency: "Daily",
          renew_date: renew.toISOString().split("T")[0],
          expected_total: 30,
        });
      }

      setBookingRef(bk.booking_ref);
      setStep(6);
    } catch (e) {
      setError(e.message || "Something went wrong — please try again.");
    } finally {
      setConfirming(false);
    }
  }

  if (step === 6) {
    return (
      <div className="p-6 flex flex-col items-center text-center gap-4 pt-16">
        <div className="w-14 h-14 rounded-full bg-accent-50 border-2 border-accent-400 flex items-center justify-center text-2xl">✓</div>
        <h1 className="font-bold text-xl">Booking Confirmed!</h1>
        <p className="text-sm text-accent-600">
          {paymentMethod === "online" ? "Payment received — your slot is secured." : "Pay the washer at your doorstep — cash, UPI, or a payment link."}
        </p>
        <div className="card w-full text-left">
          <div className="flex justify-between text-sm"><span className="text-accent-600">Booking ID</span><span className="font-semibold">{bookingRef}</span></div>
          <div className="border-t border-accent-50 mt-2 pt-2 text-sm">
            <p className="font-semibold">{chosenPlan?.name}</p>
            <p className="text-accent-600 mt-1">{scheduledDate} · {timeSlot}</p>
          </div>
          <div className="flex justify-between mt-2 pt-2 border-t border-accent-50">
            <span className="text-sm font-semibold">Total Paid</span>
            <span className="font-bold text-lg">₹{total}</span>
          </div>
        </div>
        <button className="btn-primary w-full" onClick={() => router.push("/home")}>Done</button>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className={`h-1 flex-1 rounded-full ${n <= step ? "bg-accent-400" : "bg-accent-50"}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-xl">Your Vehicle</h2>
          {vehicles.length > 0 && (
            <div className="flex flex-col gap-2">
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  onClick={() => { setSelectedVehicleId(v.id); setAddingNew(false); setSelectedPlan(""); }}
                  className={`card text-left flex items-center gap-3 ${selectedVehicleId === v.id && !addingNew ? "border border-accent-400 bg-accent-50" : ""}`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{v.brand} · {v.color}</p>
                    <p className="text-xs text-accent-600">{v.reg_number} · {v.category}</p>
                  </div>
                </button>
              ))}
              <button onClick={() => { setAddingNew(true); setSelectedVehicleId(""); }} className="p-3 border border-dashed border-accent-300 rounded-cc text-sm text-left text-accent-600">
                + Add a different vehicle
              </button>
            </div>
          )}
          {addingNew && (
            <div className="flex flex-col gap-2">
              <input className="input" placeholder="Brand / model, e.g. Hyundai Creta" value={newVehicle.brand} onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })} />
              <input className="input" placeholder="Registration number" value={newVehicle.reg} onChange={(e) => setNewVehicle({ ...newVehicle, reg: e.target.value })} />
              <input className="input" placeholder="Color" value={newVehicle.color} onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })} />
              {category && <p className="text-xs text-accent-500">✓ Recognized as {category}</p>}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm text-accent-600">How would you like to wash?</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setServiceType("onetime"); setSelectedPlan(""); }} className={`card text-center ${serviceType === "onetime" ? "border border-accent-400 bg-accent-50" : ""}`}>
                <p className="font-bold text-sm">One-Time Wash</p>
                <p className="text-xs text-accent-600 mt-1">Pay per wash</p>
              </button>
              <button onClick={() => { setServiceType("subscription"); setSelectedPlan(""); }} className={`card text-center ${serviceType === "subscription" ? "border border-accent-400 bg-accent-50" : ""}`}>
                <p className="font-bold text-sm">Subscription</p>
                <p className="text-xs text-accent-600 mt-1">Save with recurring</p>
              </button>
            </div>
          </div>

          <button
            disabled={!category || !serviceType || (addingNew && (!newVehicle.brand || !newVehicle.reg))}
            onClick={() => setStep(2)}
            className="btn-primary w-full disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-bold text-xl">{serviceType === "onetime" ? "Choose a Wash" : "Choose a Plan"}</h2>
          {plansForType.map((p) => {
            const price = priceForTier(p, tier);
            const selected = selectedPlan === p.id;
            return (
              <button key={p.id} onClick={() => setSelectedPlan(p.id)} className={`card text-left ${selected ? "border border-accent-400" : ""}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base">{p.name}</span>
                      {p.recommended && <span className="text-[10px] bg-accent-50 text-accent-600 px-2 py-0.5 rounded-full">Recommended</span>}
                    </div>
                    <p className="text-xs text-accent-600 mt-1">{p.tagline}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">₹{price}</p>
                    {serviceType !== "onetime" && <p className="text-[11px] text-accent-500">₹{Math.round(price / 30)}/wash</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs">
                  <span className="text-brandYellow">★</span> {p.rating} <span className="text-accent-500">({p.reviews})</span>
                </div>
              </button>
            );
          })}
          <button disabled={!selectedPlan} onClick={() => setStep(3)} className="btn-primary w-full disabled:opacity-40">Continue</button>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-bold text-xl">Add Extras?</h2>
          <p className="text-xs text-accent-600">Optional — skip if you'd just like the base plan.</p>
          {addons.map((a) => {
            const selected = selectedAddons.includes(a.id);
            return (
              <button
                key={a.id}
                onClick={() => setSelectedAddons(selected ? selectedAddons.filter((x) => x !== a.id) : [...selectedAddons, a.id])}
                className={`card text-left flex justify-between gap-3 ${selected ? "border border-accent-400 bg-accent-50" : ""}`}
              >
                <div>
                  <p className="text-sm font-semibold">{a.name}</p>
                  <p className="text-xs text-accent-600 mt-0.5">{a.description}</p>
                </div>
                <p className="text-sm font-semibold whitespace-nowrap">+₹{priceForTier(a, tier)}</p>
              </button>
            );
          })}
          <button onClick={() => setStep(4)} className="btn-primary w-full">{selectedAddons.length ? "Continue" : "Skip"}</button>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-xl">Schedule &amp; Address</h2>
          <div className="card flex flex-col gap-2">
            <label className="text-xs text-accent-600">Date</label>
            <input className="input" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            <label className="text-xs text-accent-600 mt-1">Time slot</label>
            <div className="grid grid-cols-2 gap-2">
              {TIME_SLOTS.map((ts) => (
                <button key={ts} onClick={() => setTimeSlot(ts)} className={timeSlot === ts ? "btn-secondary text-xs" : "btn-ghost text-xs border border-transparent"}>{ts}</button>
              ))}
            </div>
          </div>
          <div className="card flex flex-col gap-2">
            <label className="text-xs text-accent-600">Wash Location</label>
            <input className="input" placeholder="Address line" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Area" value={address.area} onChange={(e) => setAddress({ ...address, area: e.target.value })} />
              <input className="input" placeholder="Pin code" value={address.pin} onChange={(e) => setAddress({ ...address, pin: e.target.value })} />
            </div>
          </div>
          <button disabled={!address.line1} onClick={() => setStep(5)} className="btn-primary w-full disabled:opacity-40">Continue to Summary</button>
        </div>
      )}

      {step === 5 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-bold text-xl">Confirm Booking</h2>
          <div className="card text-sm text-accent-600">
            <p className="font-semibold text-ink">{addingNew ? newVehicle.brand : `${selectedVehicle?.brand} · ${selectedVehicle?.reg_number}`}</p>
            <p className="mt-1">{scheduledDate} · {timeSlot}</p>
            <p className="mt-1">{address.line1}, {address.area} {address.pin}</p>
          </div>

          <div className="card">
            <p className="text-sm font-semibold mb-2">Coupon or Referral Code</p>
            {!appliedCoupon ? (
              <div className="flex gap-2">
                <input className="input flex-1 uppercase" placeholder="Enter code" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} />
                <button className="btn-secondary" onClick={applyCoupon}>Apply</button>
              </div>
            ) : (
              <div className="flex justify-between items-center bg-accent-50 border border-accent-100 px-3 py-2 rounded-cc text-sm">
                <span><strong>{appliedCoupon.code}</strong> applied</span>
                <button className="text-xs text-accent-600" onClick={() => setAppliedCoupon(null)}>Remove</button>
              </div>
            )}
          </div>

          <div className="card">
            <p className="text-sm font-semibold mb-2">Price Breakdown</p>
            <div className="flex justify-between text-sm"><span>{chosenPlan?.name}</span><span>₹{planPrice}</span></div>
            {selectedAddons.map((id) => {
              const a = addons.find((x) => x.id === id);
              return <div key={id} className="flex justify-between text-sm text-accent-600 mt-1"><span>{a.name}</span><span>₹{priceForTier(a, tier)}</span></div>;
            })}
            {discount > 0 && <div className="flex justify-between text-sm text-accent-500 mt-1"><span>Discount</span><span>-₹{discount}</span></div>}
            <div className="flex justify-between items-baseline mt-2 pt-2 border-t border-accent-50">
              <span className="text-sm font-semibold">Total payable</span>
              <span className="font-bold text-2xl">₹{total}</span>
            </div>
          </div>

          <div className="card flex flex-col gap-2">
            <p className="text-sm font-semibold">Payment Method</p>
            <button onClick={() => setPaymentMethod("doorstep")} className={`card text-left ${paymentMethod === "doorstep" ? "border border-accent-400" : ""}`}>
              <p className="text-sm font-semibold">Pay at your doorstep</p>
              <p className="text-xs text-accent-600 mt-0.5">Cash, UPI, or a payment link when the team arrives.</p>
            </button>
            <button onClick={() => setPaymentMethod("online")} className={`card text-left ${paymentMethod === "online" ? "border border-accent-400" : ""}`}>
              <p className="text-sm font-semibold">Pay online now</p>
              <p className="text-xs text-accent-600 mt-0.5">UPI, card, netbanking or wallet — secures your slot instantly.</p>
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={confirming} onClick={confirmBooking} className="btn-primary w-full disabled:opacity-60">
            {confirming ? "Confirming…" : paymentMethod === "online" ? `Pay ₹${total} & Confirm` : "Confirm Booking"}
          </button>
        </div>
      )}
    </div>
  );
}
