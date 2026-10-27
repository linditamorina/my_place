"use client";

import { House, Plus, Receipt, User, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SIDE_ITEMS = [
  [
    { href: "/banori", label: "Ballina", icon: House },
    { href: "/banori/faturat", label: "Faturat", icon: Receipt },
  ],
  [
    { href: "/banori/arka", label: "Arka", icon: Wallet },
    { href: "/banori/profili", label: "Profili", icon: User },
  ],
] as const;

export function ResidentNav() {
  return <ResidentNavBar pathname={usePathname()} />;
}

/** Pa pathname (gjatë prerender-it) asnjë lidhje nuk shënohet aktive. */
export function ResidentNavBar({ pathname }: { pathname: string | null }) {
  const isActive = (href: string) =>
    pathname !== null && (href === "/banori" ? pathname === "/banori" : pathname.startsWith(href));

  const renderItem = ({ href, label, icon: Icon }: (typeof SIDE_ITEMS)[number][number]) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex h-14 flex-col items-center justify-center gap-1 text-[11px] ${
          active ? "font-bold" : "font-semibold text-muted"
        }`}
      >
        <Icon className="size-[22px]" strokeWidth={active ? 2 : 1.8} aria-hidden="true" />
        {label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Navigimi"
      className="fixed inset-x-0 bottom-0 z-10 mx-auto grid h-20 max-w-md grid-cols-5 items-center border-t border-line bg-white px-3 pb-1.5 print:hidden"
    >
      {SIDE_ITEMS[0].map(renderItem)}
      <Link
        href="/banori/raporto"
        aria-label="Raporto prishje"
        className="-mt-7 flex size-14 items-center justify-center justify-self-center rounded-[20px] border-4 border-soft bg-deep text-white"
      >
        <Plus className="size-6" strokeWidth={2.2} aria-hidden="true" />
      </Link>
      {SIDE_ITEMS[1].map(renderItem)}
    </nav>
  );
}
