"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEV_BYPASS_COOKIE } from "@/lib/dev-mode";
import { ADMIN_COOKIE } from "@/lib/admin-auth";

export async function logout() {
  // Clear the admin + dev bypass cookies if present.
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
  cookieStore.delete(DEV_BYPASS_COOKIE);

  // Sign out of the real Supabase session if there is one.
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect("/login");
}
