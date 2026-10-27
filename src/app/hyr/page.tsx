import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Building, ShieldCheck, Wallet } from "lucide-react";
import { SubmitButton } from "@/components/client";
import { Logo, LogoMark } from "@/components/logo";
import { btn } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { demoLogin } from "./actions";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Hyr" };

const FEATURES = [
  { icon: Wallet, text: "Arka e hyrjes e hapur për të gjithë banorët" },
  { icon: Building, text: "Faturat, pagesat dhe prishjet në një vend" },
  { icon: ShieldCheck, text: "Çdo pagesë me dëftesë dhe gjurmë" },
];

export default function LoginPage() {
  const demo = process.env.DEMO_MODE === "1";
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>

      <aside className="hidden flex-col justify-between bg-deep p-12 text-white lg:flex lg:w-[44%]">
        <span className="flex items-center gap-3">
          <LogoMark size={44} inverted />
          <span className="text-2xl font-extrabold tracking-tight">MyPlace</span>
        </span>
        <div className="flex max-w-md flex-col gap-8">
          <h1 className="text-[40px] font-extrabold leading-[1.1] tracking-tight">
            Gjithçka për hyrjen tënde, në një vend.
          </h1>
          <ul className="flex flex-col gap-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[15px] font-semibold text-white/80">
                <span className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-soft">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <span className="text-sm text-white/70">Projekt demonstrues · të dhënat janë fiktive</span>
      </aside>

      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-[28px] font-extrabold tracking-tight">Mirë se erdhe</h2>
            <p className="text-[15px] text-muted">Hyr për të parë faturat, arkën dhe njoftimet e hyrjes.</p>
          </div>
          <div className="rounded-3xl bg-white p-6">
            <LoginForm />
          </div>
          {demo ? (
            <div className="flex flex-col gap-3">
              <p className="text-center text-sm font-semibold text-muted">Ose provo demon pa llogari</p>
              <form action={demoLogin} className="grid grid-cols-2 gap-3">
                <SubmitButton name="account" value="admin" className={btn.white}>
                  Si administrator
                </SubmitButton>
                <SubmitButton name="account" value="banor" className={btn.white}>
                  Si banor
                </SubmitButton>
              </form>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

async function RedirectIfSignedIn() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/banori");
  return null;
}
