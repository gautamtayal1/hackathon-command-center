"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  adminCookieToken,
  getAdminPassword,
  isAdminPasswordConfigured,
} from "@/lib/admin-auth";

export type AdminLoginState = {
  status: "idle" | "error";
  message: string;
};

function safeNextPath(value: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  if (value.startsWith("/judge")) {
    return "/";
  }

  return value;
}

export async function adminLogin(
  _previousState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  if (!isAdminPasswordConfigured()) {
    return {
      status: "error",
      message: "Admin password is not set. Add ADMIN_PASSWORD to your env.",
    };
  }

  const password = String(formData.get("password") ?? "");
  const nextPath = safeNextPath(String(formData.get("next") ?? "/"));

  if (password !== getAdminPassword()) {
    return { status: "error", message: "Wrong password." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, adminCookieToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(nextPath);
}
