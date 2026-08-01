"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const REFRESH_DEBOUNCE_MS = 180;

export function RealtimeRefresh() {
  const router = useRouter();
  const [connectionStatus, setConnectionStatus] = useState("CONNECTING");
  const [eventCount, setEventCount] = useState(0);

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
      .on("broadcast", { event: "invalidate" }, () => {
        setEventCount((count) => count + 1);
        scheduleRefresh();
      })
      .subscribe((status) => setConnectionStatus(status));

    document.addEventListener("visibilitychange", refreshVisiblePage);

    return () => {
      document.removeEventListener("visibilitychange", refreshVisiblePage);

      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
      }

      void supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <span
      hidden
      data-realtime-status={connectionStatus}
      data-realtime-events={eventCount}
    />
  );
}
