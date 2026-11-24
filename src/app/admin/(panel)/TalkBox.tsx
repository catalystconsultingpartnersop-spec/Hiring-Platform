"use client";

import { useState } from "react";
import { SpeakButton } from "./candidates/SpeakButton";

// A text box you can talk into: tap Speak, talk, and the words land in the box.
export function TalkBox({ name, placeholder, rows = 3, defaultValue = "", required }: { name: string; placeholder?: string; rows?: number; defaultValue?: string; required?: boolean }) {
  const [v, setV] = useState(defaultValue);
  return (
    <div>
      <textarea className="textarea" name={name} rows={rows} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} required={required} />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
        <SpeakButton onText={(t) => setV((cur) => (cur.trim() ? `${cur.trimEnd()} ${t}` : t))} />
      </div>
    </div>
  );
}
