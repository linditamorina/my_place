import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: { default: "MyPlace", template: "%s · MyPlace" },
  description: "Gjithçka për hyrjen tënde, në një vend.",
};

export const viewport: Viewport = {
  themeColor: "#0f3d36",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sq" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full bg-soft font-sans text-deep">{children}</body>
    </html>
  );
}
