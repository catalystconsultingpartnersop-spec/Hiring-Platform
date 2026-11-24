"use client";

import { useEffect, useState } from "react";
import styles from "../matches/matches.module.css";

type D = { title: string; meta: string; experience: string; great: string; good: string; type: string };
const THEMES: [string, string, string][] = [
  ["navy", "Navy", "#17213a"],
  ["gold", "Gold", "#f2b300"],
  ["light", "Light", "#f6f3ea"],
];

// "Share this candidate": a teaser poster for business owners. Experience, what they're
// great and good at (Strengths Assessment wording), their type. Never a name.
export function ShareCandidate({ id, d, link }: { id: string; d: D; link: string }) {
  const [v, setV] = useState<D>(d);
  const [th, setTh] = useState("navy");
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setQ(new URLSearchParams({ t: v.title, m: v.meta, y: v.type, e: v.experience, g: v.great, d: v.good, th }).toString()), 500);
    return () => clearTimeout(timer);
  }, [v, th]);
  const set = (k: keyof D) => (e: { target: { value: string } }) => setV((cur) => ({ ...cur, [k]: e.target.value }));
  const caption = [
    `Available now: ${v.title}${v.meta ? ` (${v.meta})` : ""}.`,
    v.type ? `A natural ${v.type.toLowerCase()}.` : "",
    v.experience ? `Experience: ${v.experience}.` : "",
    v.great ? `Great at: ${v.great}.` : "",
    v.good ? `Good at: ${v.good}.` : "",
    `\nMet by our team. Want to meet them? ${link}`,
  ]
    .filter(Boolean)
    .join("\n");
  const field = (k: keyof D, label: string, ph = "") => (
    <label className="field" style={{ margin: 0 }}>
      <span>{label}</span>
      <input className="input" value={v[k]} onChange={set(k)} maxLength={80} placeholder={ph} />
    </label>
  );
  const file = v.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "candidate";
  return (
    <div className={styles.share}>
      <div style={{ display: "grid", gap: 10, alignContent: "start", minWidth: 0 }}>
        {field("title", "Title")}
        {field("type", "Type (from their Strengths Assessment)", "Thorough executor")}
        {field("meta", "Where, level, hours")}
        {field("experience", "Experience", "10 years running a busy front office")}
        {field("great", "Great at")}
        {field("good", "Good at")}
        <div className="field" style={{ margin: 0 }}>
          <span>Color</span>
          <div style={{ display: "flex", gap: 8 }}>
            {THEMES.map(([k, label, c]) => (
              <button key={k} type="button" className={`btn btn-small ${th === k ? "btn-gold" : "btn-ghost"}`} onClick={() => setTh(k)}>
                <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 7, background: c, border: "1px solid #c9cfdd", marginRight: 6, verticalAlign: "-2px" }} />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          <a className="btn btn-gold btn-small" href={`/share/cand/${id}-status.png?${q}`} download={`${file}-status.png`}>
            Save for WhatsApp status
          </a>
          <a className="btn btn-ghost btn-small" href={`/share/cand/${id}.png?${q}`} download={`${file}.png`}>
            Save for a chat
          </a>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => navigator.clipboard?.writeText(caption).then(() => setCopied(true), () => null)}>
            {copied ? "Copied" : "Copy the text"}
          </button>
        </div>
        <p className={styles.muted} style={{ margin: 0 }}>
          Clear a box to leave it off. The text has your own link, so an owner who comes from it is yours. Their name never shows.
        </p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {q && <img src={`/share/cand/${id}-status.png?${q}`} alt="The poster" className={styles.poster} />}
    </div>
  );
}
