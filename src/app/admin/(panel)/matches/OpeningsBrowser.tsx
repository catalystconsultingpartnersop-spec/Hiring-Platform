"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./matches.module.css";

export type OpeningRow = {
  id: string;
  title: string;
  company: string | null;
  place: string | null;
  tags: string[];
  role: string;
  job: string;
  added: string;
  addedMs: number;
  matches: number;
  strong: number;
  top: string[];
};

// Every open job, written up, with filters: what it is, where, and who fits.
export function OpeningsBrowser({ rows, mine }: { rows: OpeningRow[]; mine: boolean }) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [place, setPlace] = useState("");
  const [only, setOnly] = useState(false);
  const [sort, setSort] = useState<"new" | "most">("new");
  const roles = useMemo(() => [...new Set(rows.map((r) => r.role).filter(Boolean))].sort(), [rows]);
  const places = useMemo(() => [...new Set(rows.map((r) => r.place).filter(Boolean) as string[])].sort(), [rows]);
  const shown = rows
    .filter((r) => {
      const hay = `${r.title} ${r.company ?? ""} ${r.place ?? ""} ${r.job} ${r.tags.join(" ")} ${r.top.join(" ")}`.toLowerCase();
      return (!q || q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) && (!role || r.role === role) && (!place || r.place === place) && (!only || r.matches > 0);
    })
    .sort((a, b) => (sort === "most" ? b.strong * 10 + b.matches - (a.strong * 10 + a.matches) : b.addedMs - a.addedMs));

  return (
    <section className={styles.box}>
      <div className={styles.filters}>
        <input className="input" placeholder="Search: title, company, town, skill…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          {roles.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select className="select" value={place} onChange={(e) => setPlace(e.target.value)}>
          <option value="">Anywhere</option>
          {places.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value as "new" | "most")}>
          <option value="new">Newest first</option>
          <option value="most">Most matches first</option>
        </select>
        <label className="check" style={{ whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} />
          <span>{mine ? "Fits my candidates" : "Has matches"}</span>
        </label>
      </div>
      <p className={styles.muted} style={{ margin: "10px 0 0" }}>
        {shown.length} of {rows.length} openings
      </p>
      <div className={styles.cards}>
        {shown.map((r) => (
          <Link key={r.id} prefetch={false} href={`/admin/matches/${r.id}`} className={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
              <b style={{ fontSize: 16.5 }}>{r.title}</b>
              {r.matches ? <span className={`tag ${r.strong ? "tag-good" : "tag-gold"}`}>{r.matches} fit</span> : <span className="tag">No fit yet</span>}
            </div>
            <small>{[r.company, r.place, `added ${r.added}`].filter(Boolean).join(" · ")}</small>
            {r.tags.length > 0 && (
              <div className={styles.tags} style={{ marginTop: 6 }}>
                {r.tags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            )}
            {r.job && <p>{r.job}</p>}
            {r.top.length > 0 && <small style={{ color: "var(--ink)" }}>{mine ? "Your fits" : "Best fits"}: {r.top.join(", ")}</small>}
          </Link>
        ))}
        {!shown.length && <p className="muted small">Nothing matches those filters.</p>}
      </div>
    </section>
  );
}
