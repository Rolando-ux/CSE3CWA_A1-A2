"use client";

import { useCallback, useEffect, useState } from "react";
import type { Stats } from "./stats";

async function fetchStats(): Promise<Stats> {
  const res = await fetch("/api/stats", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Stats request failed (${res.status})`);
  }
  return res.json();
}

/**
 * Loads the dashboard figures from /api/stats. The previous figures stay on
 * screen while a refresh is in flight, so the page never flashes empty.
 */
export function useStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    fetchStats()
      .then((next) => {
        if (!isCurrent) return;
        setStats(next);
        setError(null);
      })
      .catch(() => {
        if (!isCurrent) return;
        setError("Could not load the dashboard data from the server.");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [reloadCount]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setReloadCount((count) => count + 1);
  }, []);

  return { stats, error, isLoading, refresh };
}
