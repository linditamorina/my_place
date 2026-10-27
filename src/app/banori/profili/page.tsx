import type { Metadata } from "next";
import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { Screen } from "@/components/resident";
import { btn, Skeleton } from "@/components/ui";
import { requireResident } from "@/lib/auth";
import { unitLabel } from "@/lib/constants";
import { initials } from "@/lib/format";
import { logout } from "../../hyr/actions";

export const metadata: Metadata = { title: "Profili" };

export default function ProfilePage() {
  return (
    <Screen>
      <h1 className="pt-1 text-[26px] font-extrabold tracking-tight">Profili</h1>
      <Suspense fallback={<Skeleton rows={2} />}>
        <Profile />
      </Suspense>
    </Screen>
  );
}

async function Profile() {
  const resident = await requireResident();
  const rows: [string, string][] = [
    ["Njësia", `${unitLabel(resident.unit)} · kati ${resident.unit.floor}`],
    ["Hyrja", `${resident.building.name}, ${resident.building.address}`],
    ["Roli", resident.isOwner ? "Pronar" : "Qiramarrës"],
    ["Email-i", resident.email],
    ["Telefoni", resident.phone ?? "—"],
  ];
  return (
    <>
      <section className="flex items-center gap-4 rounded-3xl bg-white p-5">
        <span className="flex size-14 items-center justify-center rounded-full bg-soft text-lg font-extrabold">
          {initials(resident.name)}
        </span>
        <span className="flex flex-col">
          <span className="text-lg font-extrabold">{resident.name}</span>
          <span className="text-sm text-muted">{unitLabel(resident.unit)}</span>
        </span>
      </section>
      <dl className="flex flex-col rounded-[20px] bg-white px-5 py-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 border-b border-line py-3.5 text-sm last:border-0">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right font-bold">{value}</dd>
          </div>
        ))}
      </dl>
      <form action={logout}>
        <button type="submit" className={`${btn.white} w-full`}>
          <LogOut className="size-[18px]" aria-hidden="true" />
          Dil nga llogaria
        </button>
      </form>
    </>
  );
}
