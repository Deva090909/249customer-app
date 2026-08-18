import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const URL_FALLBACK = "https://dbddxgwljpkrxtyknuhv.supabase.co";
const KEY_FALLBACK =
  "eyJhbGci••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••";

// Demo mode: there is no login page — anyone hitting a protected route is
// transparently signed into one shared demo account (auto-created on first
// use) instead of being asked to authenticate.
const DEMO_EMAIL = "demo@cleancar.app";
const DEMO_PASSWORD = "cleancar-demo-2026";

export async function middleware(req) {
  let res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || URL_FALLBACK,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || KEY_FALLBACK,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isSignup = req.nextUrl.pathname.startsWith("/signup");
  const isPublic = req.nextUrl.pathname.startsWith("/_next") || req.nextUrl.pathname.startsWith("/favicon");

  if (!user && !isSignup && !isPublic) {
    let { error: signInError } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });

    if (signInError) {
      // Demo account doesn't exist yet on this Supabase project — create it once.
      await supabase.auth.signUp({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        options: { data: { first_name: "Priya" } },
      });
      await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$|.*\\.svg$).*)"],
};