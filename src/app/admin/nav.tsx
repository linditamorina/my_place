"use client";

import {
  Bell,
  Building,
  CreditCard,
  LayoutDashboard,
  ListChecks,
  Receipt,
  SquareCheck,
  Wallet,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Pasqyra", icon: LayoutDashboard },
  { href: "/admin/banesat", label: "Banesat", icon: Building },
  { href: "/admin/faturat", label: "Faturat", icon: Receipt },
  { href: "/admin/pagesat", label: "Pagesat", icon: CreditCard, badge: "payments" },
  { href: "/admin/arka", label: "Arka", icon: Wallet },
  { href: "/admin/prishjet", label: "Prishjet", icon: Wrench, badge: "tickets" },
  { href: "/admin/njoftimet", label: "Njoftimet", icon: Bell },
  { href: "/admin/votimet", label: "Votimet", icon: SquareCheck },
  { href: "/admin/aktiviteti", label: "Aktiviteti", icon: ListChecks },
] as const;

export type NavCounts = { payments?: number; tickets?: number };

export function AdminNav({ counts }: { counts: NavCounts }) {
  return <AdminNavLinks counts={counts} pathname={usePathname()} />;
}

/** Pa pathname (gjatë prerender-it) asnjë lidhje nuk shënohet aktive. */
export function AdminNavLinks({ counts, pathname }: { counts: NavCounts; pathname: string | null }) {
  return (
    <nav
      aria-label="Menyja kryesore"
      className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:px-4 lg:pb-0"
    >
      {ITEMS.map((item) => {
        const active =
          pathname !== null && (item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href));
        const badge = "badge" in item ? item.badge : undefined;
        const count = badge ? counts[badge] : undefined;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-[15px] transition ${
              active ? "bg-soft font-bold" : "font-semibold text-muted hover:bg-soft/60 hover:text-deep"
            }`}
          >
            <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
            {item.label}
            {count ? (
              <span
                className={`ml-auto flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                  badge === "payments" ? "bg-deep text-white" : "bg-soft"
                }`}
              >
                {count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
