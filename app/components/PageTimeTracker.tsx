"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const ENDPOINT = "/api/metrics/session";

function sendSession(path: string, durationSeconds: number) {
  const body = JSON.stringify({ path, durationSeconds });

  // sendBeacon is built for reporting while a page is closing; fall back to a
  // keepalive fetch where it is unavailable.
  if (
    typeof navigator.sendBeacon === "function" &&
    navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }))
  ) {
    return;
  }
  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Metrics must never surface errors to the visitor.
  });
}

/**
 * Measures how long each page is actually on screen (hidden tabs don't
 * count) and reports it once the visitor navigates away, hides the tab or
 * closes the page. Renders nothing.
 */
export default function PageTimeTracker() {
  const pathname = usePathname();

  useEffect(() => {
    let visibleSince: number | null =
      document.visibilityState === "visible" ? Date.now() : null;
    let visibleMs = 0;

    function pause() {
      if (visibleSince !== null) {
        visibleMs += Date.now() - visibleSince;
        visibleSince = null;
      }
    }

    function flush() {
      pause();
      const seconds = Math.round(visibleMs / 1000);
      visibleMs = 0;
      if (seconds >= 1) sendSession(pathname, seconds);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        flush();
      } else if (visibleSince === null) {
        visibleSince = Date.now();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", flush);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", flush);
      flush(); // client-side navigation away from this page
    };
  }, [pathname]);

  return null;
}
