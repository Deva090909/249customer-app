"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Demo mode: this is a sales/preview build, so any email + password on
  // this form logs in — it's silently routed to one shared demo account
  // (auto-created on first use) rather than requiring real signup.
  const DEMO_EMAIL = "demo@cleancar.app";
  const DEMO_PASSWORD = "cleancar-demo-2026";

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = supabaseBrowser();

    let { error: signInError } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });

    if (signInError) {
      // Demo account doesn't exist yet on this Supabase project — create it once.
      const { error: signUpError } = await supabase.auth.signUp({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        options: { data: { first_name: "Priya" } },
      });
      if (signUpError) {
        setLoading(false);
        setError(signUpError.message);
        return;
      }
      // If email confirmation is off, signUp already returns a session.
      // If it's on, try signing in again in case it auto-confirmed anyway.
      const retry = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      if (retry.error) {
        setLoading(false);
        setError(
          "Demo account created — if email confirmation is enabled on this Supabase project, disable it under Authentication → Providers to allow instant demo login."
        );
        return;
      }
    }

    setLoading(false);
    router.push("/home");
    router.refresh();
  }

  return (
    <div className="p-6 flex flex-col gap-5 min-h-screen justify-center">
      <div>
        <h1 className="font-bold text-2xl text-ink">24/9 Carwashing</h1>
        <p className="text-sm text-accent-600 mt-1">Demo mode — enter anything and log in.</p>
      </div>
      <form onSubmit={handleLogin} className="flex flex-col gap-3">
        <div>
          <label className="text-xs text-accent-600 block mb-1">Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <label className="text-xs text-accent-600 block mb-1">Password</label>
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={loading} type="submit">
          {loading ? "Logging in…" : "Log In"}
        </button>
      </form>
      <p className="text-sm text-accent-600 text-center">
        New here?{" "}
        <Link href="/signup" className="text-accent-500 font-semibold">
          Create an account
        </Link>
      </p>
    </div>
  );
}
