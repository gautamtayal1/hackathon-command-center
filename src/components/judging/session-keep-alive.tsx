"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * A judging page sits open for the whole event without a single navigation, so
 * nothing would otherwise renew the Supabase cookie before its hour is up. This
 * nudges the browser client to refresh the token in the background, which is
 * what stops a save at minute 61 from bouncing the judge to the login screen.
 */
export function SessionKeepAlive({ minutes = 4 }: { minutes?: number }) {
  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    async function refresh() {
      if (cancelled) {
        return;
      }

      try {
        // getSession refreshes the token when it is close to expiring and
        // writes the new cookie the server actions read.
        await supabase.auth.getSession();
      } catch {
        // Offline or a transient Supabase blip: the next tick tries again.
      }
    }

    void refresh();

    const timer = setInterval(refresh, Math.max(1, minutes) * 60 * 1000);

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }

    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("online", refresh);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("online", refresh);
    };
  }, [minutes]);

  return null;
}
