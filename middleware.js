import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const URL_FALLBACK = "https://dbddxgwljpkrxtyknuhv.supabase.co";
const KEY_FALLBACK =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiZGR4Z3dsanBrcnh0eWtudWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NjcwNzEsImV4cCI6MjEwMjU0MzA3MX0.mfaC_n6kmIWlS0aEmbmGLIumljHNsaYgI4vrLyClqtI";

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

  const isAuthRoute = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/signup");
  const isPublic = req.nextUrl.pathname.startsWith("/_next") || req.nextUrl.pathname.startsWith("/favicon");

  if (!user && !isAuthRoute && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = req.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$|.*\\.svg$).*)"],
};
