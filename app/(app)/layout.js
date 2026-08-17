"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/home", label: "Home" },
  { href: "/book", label: "Book" },
  { href: "/plans", label: "Plans" },
  { href: "/history", label: "History" },
  { href: "/account", label: "Account" },
];

export default function AppShellLayout({ children }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 pb-20">{children}</div>
      <div className="fixed bottom-0 left-0 right-0 max-w-[460px] mx-auto bg-white border-t-2 border-accent-50 flex z-20">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex-1 text-center py-3 text-[11.5px] font-semibold ${
                active ? "text-accent-500" : "text-accent-600/60"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
