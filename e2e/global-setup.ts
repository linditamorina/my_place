import { execSync } from "node:child_process";
import { E2E_ENV } from "../playwright.config";

// Para çdo ekzekutimi: databaza e testeve krijohet nga migrimet dhe mbushet me hyrjen demo.
export default function globalSetup() {
  const env = { ...process.env, ...E2E_ENV };
  execSync("npx prisma migrate deploy", { env, stdio: "inherit" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "inherit" });
}
