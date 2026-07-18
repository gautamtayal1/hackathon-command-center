"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Quietly re-fetches the server component on an interval so the big-screen
 * display picks up new teams/allocations without anyone touching it.
 */
export function AutoRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
