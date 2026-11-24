"use client";

import { useEffect, useState } from "react";
import styles from "./matches.module.css";

// "Share this job": a ready poster for WhatsApp status, plus the text to go with it.
// The words start filled in from the opening; change anything and the picture follows.
export function ShareJob({ id, title, meta, lines, link }: { id: string; title: string; meta: string; lines: string[]; link: string }) {
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
  const caption = `Now hiring: ${t}${m ? ` (${m})` : ""}.\n\nLooking for work, or know someone who'd be great for this? Start here, it takes a couple of minutes:\n${link}`;
  const file = t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "job";
  return (
    <div className={styles.share}>
      <div style={{ display: "grid", gap: 10, alignContent: "start", minWidth: 0 }}>
        <label className="field" style={{ margin: 0 }}>
          <span>Title</span>
          <input className="input" value={t} onChange={(e) => setT(e.target.value)} maxLength={60} />
        </label>
        <label className="field" style={{ margin: 0 }}>
          <span>Where, hours, pay</span>
          <input className="input" value={m} onChange={(e) => setM(e.target.value)} maxLength={80} placeholder="Brooklyn · Full-time · Top pay for the right person" />
        </label>
        <div className="field" style={{ margin: 0 }}>
          <span>You&rsquo;d be great if you&rsquo;re:</span>
          {l.map((x, i) => (
            <input key={i} className="input" style={{ marginTop: i ? 6 : 0 }} value={x} maxLength={60} onChange={(e) => setL((cur) => cur.map((y, j) => (j === i ? e.target.value : y)))} placeholder={["Great with numbers", "Calm under pressure", "Ready to lead a team"][i]} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          <a className="btn btn-gold btn-small" href={`/share/job/${id}-status.png?${q}`} download={`${file}-status.png`}>
            Save for WhatsApp status
          </a>
          <a className="btn btn-ghost btn-small" href={`/share/job/${id}.png?${q}`} download={`${file}.png`}>
            Save for a chat
          </a>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => navigator.clipboard?.writeText(caption).then(() => setCopied(true), () => null)}>
            {copied ? "Copied" : "Copy the text"}
          </button>
        </div>
        <p className={styles.muted} style={{ margin: 0 }}>
          The text has your own link, so anyone who signs up from it is yours. The company&rsquo;s name stays private.
        </p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {q && <img src={`/share/job/${id}-status.png?${q}`} alt="The poster" className={styles.poster} />}
    </div>
  );
}
