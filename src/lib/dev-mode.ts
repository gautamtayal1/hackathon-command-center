import type { DrakiUser } from "@/lib/auth";

export const DEV_BYPASS_COOKIE = "draki_dev_bypass";

/**
 * Dev-only auth bypass. Enabled when NEXT_PUBLIC_IS_DEVELOPMENT is "true".
 * NEXT_PUBLIC_ prefix so the flag is readable in the browser to toggle the
 * bypass button on the login page.
 */
export function isDevBypassEnabled(): boolean {
  return process.env.NEXT_PUBLIC_IS_DEVELOPMENT === "true";
}

/**
 * Synthetic user returned by getCurrentUser() when the dev bypass cookie is
 * present. Uses a fixed id/email so the same workspace + profile are reused
 * across dev sessions.
 */
export const DEV_USER: DrakiUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "dev@draki.local",
  name: "Dev Admin",
};
