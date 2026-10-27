import type { Metadata } from "next";
import { Suspense } from "react";
import { Banknote } from "lucide-react";
import { SubmitButton } from "@/components/client";
import { btn, Card, Chip, PageTitle, Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { unitLabel } from "@/lib/constants";
import { db } from "@/lib/db";
import { getDebts } from "@/lib/finance";
import { euro } from "@/lib/format";
import { registerCash, updateFee } from "../actions";

export const metadata: Metadata = { title: "Banesat" };

export default function UnitsPage() {
  return (
    <div className="flex flex-col gap-7">
      <PageTitle title="Banesat dhe lokalet" subtitle="Tarifat mujore, pronarët dhe borxhet" />
      <Suspense fallback={<Skeleton rows={3} />}>
        <UnitsTable />
      </Suspense>
    </div>
  );
}

async function UnitsTable() {
  const admin = await requireAdmin();
  const [units, debts] = await Promise.all([
    db.unit.findMany({
      where: { buildingId: admin.buildingId },
      include: { residents: { select: { name: true, isOwner: true } } },
    }),
    getDebts(admin.buildingId),
  ]);
  units.sort((a, b) => a.kind.localeCompare(b.kind) || Number(a.number) - Number(b.number));
  const debtors = [...debts.values()].filter((d) => d.debtCents > 0);

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Chip tone="white">{units.length} njësi</Chip>
        <Chip tone="white">{debtors.length} me borxh</Chip>
        <Chip tone="white">{euro(debtors.reduce((s, d) => s + d.debtCents, 0))} borxh gjithsej</Chip>
      </div>
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[15px]">
            <thead className="text-[13px] text-muted">
              <tr>
                <th className="px-6 py-4 font-semibold">Njësia</th>
                <th className="px-3 py-4 font-semibold">Kati</th>
                <th className="px-3 py-4 font-semibold">m²</th>
                <th className="px-3 py-4 font-semibold">Pronari</th>
                <th className="px-3 py-4 font-semibold">Tarifa mujore</th>
                <th className="px-3 py-4 font-semibold">Borxhi</th>
                <th className="px-6 py-4 font-semibold">
                  <span className="sr-only">Veprime</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => {
                const debt = debts.get(unit.id);
                const label = unitLabel(unit);
                return (
                  <tr key={unit.id} className="border-t border-line">
                    <td className="px-6 py-3 font-bold">{label}</td>
                    <td className="px-3 py-3">{unit.floor === 0 ? "Përdhesë" : unit.floor}</td>
                    <td className="px-3 py-3">{unit.areaM2}</td>
                    <td className="px-3 py-3">
                      <span className="flex flex-col">
                        <span className="font-semibold">{unit.ownerName}</span>
                        <span className="text-[13px] text-muted">
                          {unit.residents.length ? "Përdor aplikacionin" : "Pa llogari në aplikacion"}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <form action={updateFee} className="flex items-center gap-2">
                        <input type="hidden" name="unitId" value={unit.id} />
                        <input
                          name="fee"
                          inputMode="decimal"
                          aria-label={`Tarifa mujore për ${label}`}
                          defaultValue={euro(unit.monthlyFeeCents).replace(" €", "")}
                          className="h-10 w-24 rounded-xl border-[1.5px] border-line px-3 text-[15px] font-semibold outline-none focus:border-mid"
                        />
                        <SubmitButton className={btn.smallOutline} pendingText="…">
                          Ruaj
                        </SubmitButton>
                      </form>
                    </td>
                    <td className="px-3 py-3">
                      {debt?.debtCents ? (
                        <span className="font-extrabold">{euro(debt.debtCents)}</span>
                      ) : debt?.pendingCents ? (
                        <Chip>Në pritje</Chip>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {debt?.debtCents ? (
                        <form action={registerCash}>
                          <input type="hidden" name="unitId" value={unit.id} />
                          <SubmitButton className={btn.smallSoft} pendingText="Duke regjistruar…">
                            <Banknote className="size-4" aria-hidden="true" />
                            Pagesë kesh
                          </SubmitButton>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-[13px] text-muted">
        «Pagesë kesh» mbyll faturën më të vjetër të papaguar të njësisë dhe i lëshon banorit dëftesë me numër.
      </p>
    </>
  );
}
