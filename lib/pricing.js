export const CATEGORIES = [
  { id: "Hatchback / Compact Sedan", tier: "hatch", examples: ["swift","i20","amaze","baleno","alto","tiago","wagonr","dzire","polo","jazz","figo"] },
  { id: "SUV / MUV / Sedan", tier: "suv", examples: ["creta","seltos","city","innova","verna","ertiga","venue","xuv300","nexon","brezza","ciaz","kushaq","slavia","ecosport"] },
  { id: "Luxury / Large SUV", tier: "lux", examples: ["fortuner","glc","x5","q7","endeavour","mercedes","bmw","audi","xuv700","scorpio","harrier","safari","thar","gloster","hilux"] },
];

export function detectCategory(model) {
  const m = (model || "").toLowerCase();
  if (!m.trim()) return "";
  for (const c of CATEGORIES) if (c.examples.some((e) => m.includes(e))) return c.id;
  return "";
}

export function tierFor(category) {
  const c = CATEGORIES.find((v) => v.id === category);
  return c ? c.tier : "hatch";
}

export function priceForTier(row, tier) {
  if (!row) return null;
  return tier === "hatch" ? row.price_hatch : tier === "suv" ? row.price_suv : row.price_lux;
}

export const TIME_SLOTS = ["6:00–8:00 AM", "8:00–10:00 AM", "4:00–6:00 PM", "6:00–8:00 PM"];

export const TRACK_STAGES = [
  { key: "booking_confirmed", label: "Booking confirmed" },
  { key: "washer_assigned", label: "Washer assigned to you" },
  { key: "on_the_way", label: "On the way to you" },
  { key: "arrived", label: "Arrived at your address" },
  { key: "wash_complete", label: "Wash complete" },
];
