"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const REFRESH_DEBOUNCE_MS = 180;

export function RealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let refreshTimer: number | null = null;
    let refreshWhenVisible = false;

    function scheduleRefresh() {
      if (document.visibilityState !== "visible") {
        refreshWhenVisible = true;
        return;
      }

      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
      }

      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        refreshWhenVisible = false;
        router.refresh();
      }, REFRESH_DEBOUNCE_MS);
    }

    function refreshVisiblePage() {
      if (document.visibilityState === "visible" && refreshWhenVisible) {
        scheduleRefresh();
      }
    }

    const channel = supabase
      .channel("draki:updates", { config: { private: false } })
      .on("broadcast", { event: "invalidate" }, scheduleRefresh)
      .subscribe();

    document.addEventListener("visibilitychange", refreshVisiblePage);

    return () => {
      document.removeEventListener("visibilitychange", refreshVisiblePage);

      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
      }

      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
