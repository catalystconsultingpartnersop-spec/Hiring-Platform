"use client";

import { useState } from "react";

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);

export function NetworkerLink({ base }: { base: string }) {
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const link = slug(name) ? `${base}?r=${slug(name)}` : "";
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <input className="input" id="networker" placeholder="Their name, e.g. Yossi Friedman" value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: 360 }} />
      {link && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <code style={{ overflowWrap: "anywhere" }}>{link}</code>
          <button
            type="button"
            className="btn btn-small"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                /* select and copy by hand */
              }
            }}
          >
            {copied ? "Copied" : "Copy their link"}
          </button>
        </div>
      )}
    </div>
  );
}
