import { createHash } from "node:crypto";

/**
 * Simple admin gate: a single password kept in the ADMIN_PASSWORD env var.
 * When it matches, we set an httpOnly cookie holding a hash of the password so
 * the session invalidates automatically if the password is ever rotated.
 */
export const ADMIN_COOKIE = "draki_admin";

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "";
}

export function isAdminPasswordConfigured(): boolean {
  return getAdminPassword().length > 0;
}

export function adminCookieToken(): string {
  const password = getAdminPassword();

  if (!password) {
    return "";
  }

  return createHash("sha256").update(`draki:${password}`).digest("hex");
}

/**
 * The synthetic user the admin session resolves to. Fixed id/email so the same
 * workspace and data are reused across logins.
 */
export const ADMIN_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "admin@draki.local",
  name: "Admin",
};
