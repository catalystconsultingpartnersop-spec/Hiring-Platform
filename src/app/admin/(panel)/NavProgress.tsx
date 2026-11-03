"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// A thin bar across the top the instant any back-office link is clicked,
// until the next page is on screen. So a click never looks ignored.
export function NavProgress() {
  const path = usePathname();
  const search = useSearchParams();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !url.pathname.startsWith("/admin")) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setBusy(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // The new page arrived: hide the bar.
  useEffect(() => {
    const t = setTimeout(() => setBusy(false), 0);
    return () => clearTimeout(t);
  }, [path, search]);

  if (!busy) return null;
  return <div className="nav-progress" role="progressbar" aria-label="Loading" />;
}
