"use client";

import { useState } from "react";
import styles from "./catalog.module.css";

// Wide screens: filters always in the sidebar. Phones: a sticky "Filter · Sort"
// bar; filters slide up from the bottom like a store app.
export function FiltersToggle({
  active,
  count,
  sort,
  children,
}: {
  active: number;
  count: number;
  sort?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.filterWrap}>
      <div className={styles.mobileBar}>
        <button type="button" className="btn btn-small" aria-expanded={open} onClick={() => setOpen(true)}>
          {active ? `Filter (${active})` : "Filter"}
        </button>
        {sort}
      </div>
      {open && <div className={styles.sheetBackdrop} onClick={() => setOpen(false)} aria-hidden="true" />}
      <div className={open ? styles.sheetOpen : styles.sheetClosed} role={open ? "dialog" : undefined} aria-label={open ? "Filters" : undefined}>
        <div className={styles.sheetHead}>
          <strong>Filters</strong>
          <button type="button" className={styles.sheetX} aria-label="Close filters" onClick={() => setOpen(false)}>
            ×
          </button>
        </div>
        <div className={styles.sheetBody}>{children}</div>
        <div className={styles.sheetFoot}>
          <button type="button" className="btn btn-gold" style={{ width: "100%" }} onClick={() => setOpen(false)}>
            Show {count} {count === 1 ? "candidate" : "candidates"}
          </button>
        </div>
      </div>
    </div>
  );
}
