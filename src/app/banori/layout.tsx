import { Suspense } from "react";
import { ResidentNav, ResidentNavBar } from "./nav";

// Aplikacioni i banorit është i ndërtuar për telefon; në desktop shfaqet si kolonë e ngushtë.
export default function ResidentLayout({ children }: LayoutProps<"/banori">) {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-soft pb-28 sm:border-x sm:border-line print:max-w-none print:border-0 print:bg-white print:pb-0">
      {children}
      <Suspense fallback={<ResidentNavBar pathname={null} />}>
        <ResidentNav />
      </Suspense>
    </div>
  );
}
