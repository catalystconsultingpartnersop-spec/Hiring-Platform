"use client";

import { useState, useSyncExternalStore } from "react";

// A note the viewer can close. Remembered in this browser only; new matches show a fresh note.
const noop = () => () => {};
export function DismissNote({ id, children }: { id: string; children: React.ReactNode }) {
  const [closed, setClosed] = useState(false);
  const remembered = useSyncExternalStore(
    noop,
    () => {
      try {
        return localStorage.getItem(`dismiss:${id}`) === "1";
      } catch {
        return false;
      }
    },
    () => true, // hidden until the browser says otherwise
  );
  if (closed || remembered) return null;
  return (
    <div style={{ position: "relative" }}>
      {children}
      <button
        type="button"
        aria-label="Close"
        className="owner-fit-close"
        onClick={() => {
          try {
            localStorage.setItem(`dismiss:${id}`, "1");
          } catch {}
          setClosed(true);
        }}
      >
        ×
      </button>
    </div>
  );
}
