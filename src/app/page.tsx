import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LogoMark } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LogoMark size={56} />
      <Suspense fallback={null}>
        <RouteByRole />
      </Suspense>
    </div>
  );
}

async function RouteByRole(): Promise<null> {
  const user = await getCurrentUser();
  redirect(!user ? "/hyr" : user.role === "ADMIN" ? "/admin" : "/banori");
}
