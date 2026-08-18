"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";
import Link from "next/link";

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = supabaseBrowser();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      router.push("/home");
      router.refresh();
    } else {
      setDone(true); // email confirmation required
    }
  }

  if (done) {
    return (
      <div className="p-6 flex flex-col gap-3 min-h-screen justify-center text-center">
        <h1 className="font-bold text-xl">Check your inbox</h1>
        <p className="text-sm text-accent-600">
          We sent a confirmation link to {email}. Confirm it, then continue.
        </p>
        <Link href="/home" className="btn-primary mt-2">
          Continue to App
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-5 min-h-screen justify-center">
      <div>
        <h1 className="font-bold text-2xl text-ink">Create your account</h1>
        <p className="text-sm text-accent-600 mt-1">Book your first doorstep wash in minutes.</p>
      </div>
      <form onSubmit={handleSignup} className="flex flex-col gap-3">
        <div>
          <label className="text-xs text-accent-600 block mb-1">First name</label>
          <input className="input" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Priya" />
        </div>
        <div>
          <label className="text-xs text-accent-600 block mb-1">Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <label className="text-xs text-accent-600 block mb-1">Password</label>
          <input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={loading} type="submit">
          {loading ? "Creating account…" : "Create Account"}
        </button>
      </form>
      <p className="text-sm text-accent-600 text-center">
        Already have an account?{" "}
        <Link href="/home" className="text-accent-500 font-semibold">
          Go to app
        </Link>
      </p>
    </div>
  );
}