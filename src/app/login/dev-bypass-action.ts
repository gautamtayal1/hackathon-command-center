"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEV_BYPASS_COOKIE, isDevBypassEnabled } from "@/lib/dev-mode";

export async function devBypassLogin(formData: FormData) {
  if (!isDevBypassEnabled()) {
    throw new Error("Dev bypass is disabled.");
  }

  const next = String(formData.get("next") ?? "/");
  const nextPath = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const cookieStore = await cookies();
  cookieStore.set(DEV_BYPASS_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(nextPath);
}
