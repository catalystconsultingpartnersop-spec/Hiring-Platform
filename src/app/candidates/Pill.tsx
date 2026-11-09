"use client";

import { useEffect, useRef, useState } from "react";

// A rounded filter button that opens a small menu of links underneath.
export function Pill({ label, on = false, wide = false, children }: { label: React.ReactNode; on?: boolean; wide?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div className="pill-wrap" ref={ref}>
      <button type="button" className={`pill ${on ? "pill-on" : ""}`} aria-expanded={open} onClick={() => setOpen(!open)}>
        {label} <span className="pill-caret" aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div className={`pill-menu ${wide ? "pill-menu-wide" : ""}`} onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}
