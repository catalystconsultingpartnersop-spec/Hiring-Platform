"use client";
import { useEffect } from "react";

// The "Share this job" button at the top: opens the poster section and scrolls to it.
export function ShareJump({ target = "share-job", label = "📣 Share this job" }: { target?: string; label?: string }) {
  return (
    <button
      type="button"
      className="btn btn-gold btn-small"
      onClick={() => {
        const d = document.getElementById(target) as HTMLDetailsElement | null;
        if (!d) return;
        d.open = true;
        d.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      {label}
    </button>
  );
}

// Opens a share section when the page is reached with its #id (e.g. from "📣 Share" on a card).
export function OpenOnHash({ target }: { target: string }) {
  useEffect(() => {
    if (window.location.hash !== `#${target}`) return;
    const d = document.getElementById(target) as HTMLDetailsElement | null;
    if (!d) return;
    d.open = true;
    setTimeout(() => d.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  }, [target]);
  return null;
}
