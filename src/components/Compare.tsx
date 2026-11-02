"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

// Pick up to three candidates and see them side by side, like a store's
// "compare" table. Kept in this browser only.
const KEY = "compare";
const EVENT = "compare-change";
export const MAX_COMPARE = 3;

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
    /* storage blocked: compare just won't persist */
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
function snapshot() {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}
function useCompare(): string[] {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function CompareToggle({ id }: { id: string }) {
  const ids = useCompare();
  const on = ids.includes(id);
  const full = !on && ids.length >= MAX_COMPARE;
  return (
    <label className={`compare-toggle${on ? " is-on" : ""}${full ? " is-full" : ""}`} title={full ? `You can compare up to ${MAX_COMPARE}` : undefined}>
      <input
        type="checkbox"
        checked={on}
        disabled={full}
        onChange={() => write(on ? read().filter((x) => x !== id) : [...read().filter((x) => x !== id), id].slice(-MAX_COMPARE))}
      />
      Compare
    </label>
  );
}

// The bar that appears at the bottom once something is ticked.
export function CompareTray() {
  const ids = useCompare();
  if (!ids.length) return null;
  return (
    <div className="compare-tray" role="region" aria-label="Compare candidates">
      <span>
        <strong>{ids.length}</strong> of {MAX_COMPARE} picked to compare
      </span>
      <span className="compare-tray-actions">
        <button type="button" className="linkish" onClick={() => write([])}>
          Clear
        </button>
        {ids.length > 1 ? (
          <Link className="btn btn-gold btn-small" href={`/candidates/compare?ids=${ids.join(",")}`}>
            Compare {ids.length}
          </Link>
        ) : (
          <span className="small muted">Pick one more</span>
        )}
      </span>
    </div>
  );
}
