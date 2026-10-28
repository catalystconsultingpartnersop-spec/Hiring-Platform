"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

// The shortlist is kept in the browser, like a shopping wishlist: no sign-in
// needed to save candidates while browsing.
const KEY = "shortlist";
const EVENT = "shortlist-change";

function read(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* storage blocked: shortlist just won't persist */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

let cache = "";
function snapshot() {
  try {
    cache = localStorage.getItem(KEY) ?? "[]";
  } catch {
    cache = "[]";
  }
  return cache;
}

function useShortlist(): string[] {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function ShortlistButton({ id, label }: { id: string; label?: boolean }) {
  const ids = useShortlist();
  const saved = ids.includes(id);
  return (
    <button
      type="button"
      className={`shortlist-btn${saved ? " is-saved" : ""}${label ? " with-label" : ""}`}
      aria-pressed={saved}
      aria-label={saved ? "Remove from shortlist" : "Save to shortlist"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const cur = read();
        write(saved ? cur.filter((x) => x !== id) : [...cur, id]);
      }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
      {label && <span>{saved ? "On your shortlist" : "Save to shortlist"}</span>}
    </button>
  );
}

export function ShortlistLink() {
  const ids = useShortlist();
  return (
    <Link className="nav-shortlist" href={ids.length ? `/candidates?saved=${ids.join(",")}` : "/candidates?saved=none"}>
      Shortlist{ids.length ? ` (${ids.length})` : ""}
    </Link>
  );
}
