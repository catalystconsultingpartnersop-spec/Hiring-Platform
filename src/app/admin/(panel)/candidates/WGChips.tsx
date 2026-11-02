import { parseResult } from "@/lib/strengths";

const NAME: Record<string, string> = { W: "Wonder", I: "Invention", D: "Discernment", G: "Galvanizing", E: "Enablement", T: "Tenacity" };

// A candidate's Working Genius at a glance (team only): geniuses (green), competencies (yellow), frustrations (red).
export function WGChips({ result, uploaded, tried }: { result: string | null; uploaded: boolean; tried: boolean }) {
  const l = parseResult(result);
  if (l.length < 6) {
    if (!uploaded) return <span className="small muted">Not uploaded</span>;
    return <span className="small muted">{tried ? "Uploaded, couldn't read it. Open to add" : "Uploaded, reading…"}</span>;
  }
  const chip = (xs: string[], tone: "good" | "mid" | "bad") => (
    <span
      title={`${tone === "good" ? "Geniuses" : tone === "mid" ? "Competencies" : "Frustrations"}: ${xs.map((x) => NAME[x]).join(", ")}`}
      style={{
        display: "inline-block",
        padding: "2px 9px",
        borderRadius: 99,
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: "0.06em",
        background: tone === "good" ? "var(--moss-soft)" : tone === "mid" ? "var(--marigold-soft)" : "var(--rust-soft)",
        color: tone === "good" ? "#1f4a31" : tone === "mid" ? "#5c4300" : "#7d2a1e",
      }}
    >
      {xs.join("")}
    </span>
  );
  return (
    <div style={{ display: "flex", gap: 6, whiteSpace: "nowrap" }}>
      {chip(l.slice(0, 2), "good")}
      {chip(l.slice(2, 4), "mid")}
      {chip(l.slice(4), "bad")}
    </div>
  );
}
