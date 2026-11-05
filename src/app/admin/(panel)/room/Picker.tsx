"use client";

import { useMemo, useState } from "react";
import type { RoomCand } from "@/lib/teamRoom";
import s from "./room.module.css";

const words = (t: string) => t.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);

// "Attach a candidate": candidates who fit the post first, then your own, then search.
export function Picker({ cands, meId, context, value, onChange }: { cands: RoomCand[]; meId: string | null; context: string; value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const live = cands.filter((c) => c.status !== "hired");
  const fits = useMemo(() => {
    const w = words(context);
    if (!w.length) return [];
    return live
      .map((c) => ({ c, n: w.filter((x) => `${c.role} ${c.headline} ${c.place}`.toLowerCase().includes(x)).length + (c.gold ? 0.5 : 0) }))
      .filter((x) => x.n >= 1)
      .sort((a, b) => b.n - a.n)
      .slice(0, 4)
      .map((x) => x.c);
  }, [context, live]);
  const query = q.trim().toLowerCase();
  const found = query ? live.filter((c) => `${c.first} ${c.headline} ${c.sub} ${c.repFirst}`.toLowerCase().includes(query)).slice(0, 8) : [];
  const mine = live.filter((c) => c.repId === meId && !fits.includes(c)).slice(0, 5);
  const gold = live.filter((c) => c.gold && !fits.includes(c) && c.repId !== meId).slice(0, 4);
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id].slice(0, 6));
  const row = (c: RoomCand) => (
    <button type="button" key={c.id} className={`${s.pick} ${value.includes(c.id) ? s.pickOn : ""}`} onClick={() => toggle(c.id)}>
      <span className={s.pickFace}>{c.first.slice(0, 1)}</span>
      <span className={s.pickText}>
        <b>{c.headline}</b>
        <span>
          {c.first} · {c.repId === meId ? "Yours" : `${c.repFirst}'s`} · {c.sub}
        </span>
      </span>
      {c.gold && <span className={s.goldTag}>⭐ Gold</span>}
      {value.includes(c.id) && <span className={s.check}>✓</span>}
    </button>
  );
  const chosen = cands.filter((c) => value.includes(c.id));
  return (
    <div>
      {chosen.length > 0 && (
        <div className={s.chosen}>
          {chosen.map((c) => (
            <span key={c.id} className={s.chip}>
              {c.gold ? "⭐ " : ""}
              {c.first}: {c.headline.slice(0, 40)}
              {c.headline.length > 40 ? "…" : ""}
              <button type="button" aria-label="Remove" onClick={() => toggle(c.id)}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <button type="button" className={s.attach} onClick={() => setOpen(!open)}>
        {open ? "Done" : "+ Attach a candidate"}
      </button>
      {open && (
        <div className={s.picker}>
          <input className="input" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a name, job, town or code (C-…)" />
          {query ? (
            <>
              <p className={s.pickLab}>Matches</p>
              {found.length ? found.map(row) : <p className="small muted">No one matches that.</p>}
            </>
          ) : (
            <>
              {fits.length > 0 && <p className={s.pickLab}>✨ Fits this post</p>}
              {fits.map(row)}
              {mine.length > 0 && <p className={s.pickLab}>Your candidates</p>}
              {mine.map(row)}
              {gold.length > 0 && <p className={s.pickLab}>⭐ Gold standard</p>}
              {gold.map(row)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
