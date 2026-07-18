import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getAdminPassword } from "@/lib/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/judge";
  }
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const email = url.searchParams.get("email")?.trim().toLowerCase();
  const next = safeNext(url.searchParams.get("next"));

  const adminPassword = getAdminPassword();
  if (!adminPassword) {
    return new NextResponse("ADMIN_PASSWORD is not configured.", {
      status: 503,
    });
  }
  if (secret !== adminPassword) {
    return new NextResponse("Forbidden.", { status: 403 });
  }
  if (!email) {
    return new NextResponse("Missing email.", { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (
    created.error &&
    !/already|registered|exists/i.test(created.error.message)
  ) {
    return new NextResponse(created.error.message, { status: 500 });
  }

  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = link.data.properties?.hashed_token;
  if (link.error || !tokenHash) {
    return new NextResponse(link.error?.message ?? "Could not create link.", {
      status: 500,
    });
  }

  const supabase = await createSupabaseServerClient();
  let verifyError: string | null = null;
  for (const type of ["magiclink", "email"] as EmailOtpType[]) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    verifyError = error.message;
  }

  return new NextResponse(verifyError ?? "Could not sign in.", { status: 500 });
}
