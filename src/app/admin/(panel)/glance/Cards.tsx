"use client";

import Link from "next/link";
import { useState } from "react";
import { refreshMemory, saveHook } from "./actions";
import s from "./glance.module.css";

export type Card = { id: string; name: string; meta: string; status: string; hook: string; bullets: string[]; quote: string; goodFor: string[]; strengths: string[]; rep: string; met: string; clip: { face: boolean } | null; clipNote: string };
const STATUS: Record<string, string> = { listed: "Listed", draft: "Draft", paused: "Paused", applied: "New" };

export function Cards({ cards }: { cards: Card[] }) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState("");
  const [playing, setPlaying] = useState("");
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = cards.filter((c) => {
    const hay = [c.name, c.meta, c.hook, c.quote, ...c.bullets, ...c.goodFor, ...c.strengths].join(" ").toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  return (
    <>
      <input className={`input ${s.search}`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: dispatch, bookkeeper, Monsey, calm under pressure…" aria-label="Search candidates" />
      {shown.length === 0 && <p className="panel panel-wash">No one matches that. Try a different word.</p>}
      <div className={s.grid}>
        {shown.map((c) => (
          <article key={c.id} className={s.card}>
            <div className={s.top}>
              {c.clip?.face && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={s.face} src={`/api/admin/clip/${c.id}?kind=face`} alt="" loading="lazy" />
              )}
              <div className={s.who}>
                <h2>
                  <Link prefetch={false} href={`/admin/candidates/${c.id}`}>{c.name}</Link>
                </h2>
                <p className={s.meta}>{c.meta}</p>
              </div>
              <span className={`tag ${c.status === "listed" ? "tag-good" : ""}`}>{STATUS[c.status] ?? c.status}</span>
            </div>
            {editing === c.id ? (
              <form action={saveHook.bind(null, c.id)} onSubmit={() => setEditing("")} className={s.edit}>
                <input className="input" name="hook" defaultValue={c.hook} maxLength={140} autoFocus aria-label="Remember them as" />
                <button className="btn btn-small">Save</button>
                <button type="button" className="btn btn-small btn-ghost" onClick={() => setEditing("")}>Cancel</button>
              </form>
            ) : c.hook ? (
              <p className={s.hook}>
                <small>Remember as</small>
                {c.hook}
                <button type="button" className={s.pen} onClick={() => setEditing(c.id)} aria-label={`Edit the line for ${c.name}`}>✎</button>
              </p>
            ) : (
              <p className={s.empty}>
                No profile written yet.{" "}
                <button type="button" className={s.link} onClick={() => setEditing(c.id)}>Add a line to remember them by</button>
              </p>
            )}
            {c.bullets.length > 0 && (
              <ul>
                {c.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
            {c.quote && <p className={s.quote}>&ldquo;{c.quote.replace(/^["“]|["”]$/g, "")}&rdquo;</p>}
            <div className={s.chips}>
              {c.strengths.map((x) => (
                <span key={x} className={s.dark}>{x}</span>
              ))}
              {c.goodFor.length > 0 && <span>Good for: {c.goodFor.join(", ")}</span>}
            </div>
            {c.clip &&
              (playing === c.id ? (
                <video className={s.video} src={`/api/admin/clip/${c.id}?kind=video`} poster={`/api/admin/clip/${c.id}?kind=photo`} controls autoPlay playsInline />
              ) : (
                <button type="button" className={s.play} onClick={() => setPlaying(c.id)}>
                  ▶ 30-second clip
                </button>
              ))}
            {c.clipNote && <p className={s.note}>Clip: {c.clipNote}</p>}
            <div className={s.foot}>
              <span>{c.rep ? `Rep: ${c.rep} · ` : ""}Joined {c.met}</span>
              <form action={refreshMemory.bind(null, c.id)}>
                <button className={s.link} title="Write this card again from the latest notes and call">↻ Refresh</button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
