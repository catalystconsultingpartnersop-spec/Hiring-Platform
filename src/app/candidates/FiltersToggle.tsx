"use client";

import { useState } from "react";
import styles from "./catalog.module.css";

// On phones the filters start collapsed so candidates show first; on wider
// screens they're always visible in the sidebar.
export function FiltersToggle({ active, children }: { active: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.filterWrap}>
      <button
        type="button"
        className={`btn btn-ghost btn-small ${styles.toggle}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "Hide filters" : active ? `Filters (${active})` : "Filter candidates"}
      </button>
      <div className={open ? styles.filtersOpen : styles.filtersClosed}>{children}</div>
    </div>
  );
}
