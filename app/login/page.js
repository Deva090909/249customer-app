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

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <div className="p-6 flex flex-col gap-5 min-h-screen justify-center">
      <div>
        <h1 className="font-bold text-2xl text-ink">24/9 Carwashing</h1>
        <p className="text-sm text-accent-600 mt-1">Log in to book your next wash.</p>
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
