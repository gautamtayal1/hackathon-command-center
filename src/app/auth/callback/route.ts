import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/judge";
  }

  return value;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = safeNext(requestUrl.searchParams.get("next"));

  // Preferred SSR flow: the email link carries a token_hash we verify here.
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  // PKCE fallback: a `code` we exchange for a session.
  const code = requestUrl.searchParams.get("code");

  const supabase = await createSupabaseServerClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    logger.error("auth_callback_verify_failed", {
      flow: "otp",
      type,
      errorMessage: error.message,
    });
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    logger.error("auth_callback_verify_failed", {
      flow: "pkce",
      errorMessage: error.message,
    });
  } else {
    logger.error("auth_callback_verify_failed", { flow: "missing_params" });
  }

  return NextResponse.redirect(new URL("/login?error=auth", requestUrl.origin));
}
