"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * The venue screens run unattended, so they pull fresh data instead of waiting
 * for someone to hit reload.
 */
export function ScreenRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), seconds * 1000);

    return () => clearInterval(timer);
  }, [router, seconds]);

  return null;
}
