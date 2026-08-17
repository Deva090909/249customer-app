import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const URL_FALLBACK = "https://dbddxgwljpkrxtyknuhv.supabase.co";
const KEY_FALLBACK =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiZGR4Z3dsanBrcnh0eWtudWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NjcwNzEsImV4cCI6MjEwMjU0MzA3MX0.mfaC_n6kmIWlS0aEmbmGLIumljHNsaYgI4vrLyClqtI";

export function supabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || URL_FALLBACK,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || KEY_FALLBACK,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {}
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {}
        },
      },
    }
  );
}
