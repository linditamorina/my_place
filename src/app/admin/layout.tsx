import { Building, LogOut } from "lucide-react";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { logout } from "../hyr/actions";
import { AdminNav, AdminNavLinks } from "./nav";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-screen lg:flex">
      <aside className="flex flex-col border-b border-line bg-white print:hidden lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-5 py-4 lg:px-7 lg:pt-7 lg:pb-8">
          <Logo />
          <form action={logout} className="lg:hidden">
            <button type="submit" aria-label="Dil" className="flex size-11 items-center justify-center rounded-xl bg-soft">
              <LogOut className="size-5" aria-hidden="true" />
            </button>
          </form>
        </div>
        <Suspense fallback={<AdminNavLinks counts={{}} pathname={null} />}>
          <NavWithCounts />
        </Suspense>
        <div className="mt-auto hidden p-4 lg:block">
          <Suspense fallback={<div className="h-[72px] rounded-2xl bg-soft" />}>
            <BuildingCard />
          </Suspense>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-10 lg:py-8 print:p-0">{children}</main>
    </div>
  );
}

async function NavWithCounts() {
  const admin = await requireAdmin();
  const [payments, tickets] = await Promise.all([
    db.payment.count({ where: { buildingId: admin.buildingId, status: "NE_PRITJE" } }),
    db.ticket.count({ where: { buildingId: admin.buildingId, status: { not: "KRYER" } } }),
  ]);
  return <AdminNav counts={{ payments, tickets }} />;
}

async function BuildingCard() {
  const admin = await requireAdmin();
  const units = await db.unit.groupBy({
    by: ["kind"],
    where: { buildingId: admin.buildingId },
    _count: true,
  });
  const count = (kind: string) => units.find((u) => u.kind === kind)?._count ?? 0;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-soft p-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white">
        <Building className="size-5" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-bold">{admin.building.name}</span>
        <span className="truncate text-[13px] text-muted">
          {count("BANESE")} banesa · {count("LOKAL")} lokale
        </span>
      </span>
      <form action={logout}>
        <button
          type="submit"
          aria-label={`Dil (${admin.name})`}
          title="Dil"
          className="flex size-10 items-center justify-center rounded-xl bg-white transition hover:text-mid"
        >
          <LogOut className="size-[18px]" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
