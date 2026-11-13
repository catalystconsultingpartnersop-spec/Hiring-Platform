"use client";

import { Analytics } from "@vercel/analytics/next";

// Counts page visits (Vercel Web Analytics: no cookies, no personal details).
// The team's own pages and each person's private pages are left out, so the
// numbers show real visitors.
const PRIVATE = /^\/(admin|me|account|call|api)(\/|$)/;

export function Visits() {
  return (
    <Analytics
      beforeSend={(event) => {
        try {
          const u = new URL(event.url);
          if (PRIVATE.test(u.pathname) || u.hostname.startsWith("team.")) return null;
          // One row per kind of page, and no ids or tokens in the address.
          u.search = "";
          return { ...event, url: u.toString() };
        } catch {
          return event;
        }
      }}
    />
  );
}
