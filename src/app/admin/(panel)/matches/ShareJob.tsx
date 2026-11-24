"use client";

import { useEffect, useState } from "react";
import styles from "./matches.module.css";

// "Share this job": a ready poster for WhatsApp status, plus the text to go with it.
// The words start filled in from the opening; change anything and the picture follows.
export function ShareJob({ id, title, meta, lines, link, kind = "job" }: { id: string; title: string; meta: string; lines: string[]; link: string; kind?: "job" | "cand" }) {
  const cand = kind === "cand";
  const base = cand ? "/share/cand" : "/share/job";
  const [t, setT] = useState(title);
  const [m, setM] = useState(meta);
  const [l, setL] = useState<string[]>([lines[0] ?? "", lines[1] ?? "", lines[2] ?? ""]);
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      const u = new URLSearchParams({ t, m });
      l.filter((x) => x.trim()).forEach((x) => u.append("l", x));
      setQ(u.toString());
    }, 500);
    return () => clearTimeout(timer);
  }, [t, m, l]);
  const said = l.filter((x) => x.trim());
  const checks = said.length ? `\n${said.map((x) => `✓ ${x}`).join("\n")}` : "";
  const caption = cand
    ? `Available now: ${t}${m ? ` (${m})` : ""}.\n\nIs this the personality you need?${checks}\n\nMet by our team. See the profile: ${link}`
    : `Job opening: ${t}${m ? ` (${m})` : ""}.\n\nDo you have the personality for this?${checks}\n\nSounds like you, or someone you know? Start here, it takes a couple of minutes:\n${link}`;
  const file = t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "job";
  return (
    <div className={styles.share}>
      <div style={{ display: "grid", gap: 10, alignContent: "start", minWidth: 0 }}>
        <label className="field" style={{ margin: 0 }}>
          <span>Title</span>
          <input className="input" value={t} onChange={(e) => setT(e.target.value)} maxLength={60} />
        </label>
        <label className="field" style={{ margin: 0 }}>
          <span>{cand ? "Where, level, hours" : "Where, hours, pay"}</span>
          <input className="input" value={m} onChange={(e) => setM(e.target.value)} maxLength={80} placeholder={cand ? "Brooklyn · Experienced · Full-time" : "Brooklyn · Full-time · Top pay for the right person"} />
        </label>
        <div className="field" style={{ margin: 0 }}>
          <span>{cand ? "Is this the personality you need? (3 short lines)" : "Do you have the personality for this? (3 short lines)"}</span>
          {l.map((x, i) => (
            <input key={i} className="input" style={{ marginTop: i ? 6 : 0 }} value={x} maxLength={60} onChange={(e) => setL((cur) => cur.map((y, j) => (j === i ? e.target.value : y)))} placeholder={["Great with numbers", "Calm under pressure", "Ready to lead a team"][i]} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          <a className="btn btn-gold btn-small" href={`${base}/${id}-status.png?${q}`} download={`${file}-status.png`}>
            Save for WhatsApp status
          </a>
          <a className="btn btn-ghost btn-small" href={`${base}/${id}.png?${q}`} download={`${file}.png`}>
            Save for a chat
          </a>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => navigator.clipboard?.writeText(caption).then(() => setCopied(true), () => null)}>
            {copied ? "Copied" : "Copy the text"}
          </button>
        </div>
        <p className={styles.muted} style={{ margin: 0 }}>
          {cand ? "The text has your own link, so an owner who comes from it is yours. Their name never shows." : "The text has your own link, so anyone who signs up from it is yours. The company\u2019s name stays private."}
        </p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {q && <img src={`${base}/${id}-status.png?${q}`} alt="The poster" className={styles.poster} />}
    </div>
  );
}
