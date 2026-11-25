import { parseResult, TRAITS, type Letter } from "@/lib/strengths";

// A candidate's Strengths Assessment at a glance (team only): natural strengths (green), close behind (green outline),
// doable in doses (yellow), wear them down (red). Same rule as TIERS in lib/strengths.
export function WGChips({ result, uploaded, tried }: { result: string | null; uploaded: boolean; tried: boolean }) {
  const l = parseResult(result);
  if (l.length < 6) {
    if (!uploaded) return <span className="small muted">Not taken yet</span>;
    return <span className="small muted">{tried ? "Uploaded, couldn't read it. Open to add" : "Uploaded, reading…"}</span>;
  }
  const chip = (xs: string[], tone: "good" | "close" | "mid" | "bad") => (
    <span
      title={`${tone === "good" ? "Natural strengths" : tone === "close" ? "Close behind" : tone === "mid" ? "Doable, in doses" : "Wears them down"}: ${xs.map((x) => TRAITS[x as Letter].label).join(", ")}`}
      style={{
        display: "inline-block",
        padding: "2px 9px",
        borderRadius: 99,
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: "0.06em",
        background: tone === "good" ? "var(--moss-soft)" : tone === "close" ? "#fff" : tone === "mid" ? "var(--marigold-soft)" : "var(--rust-soft)",
        boxShadow: tone === "close" ? "inset 0 0 0 1.5px var(--moss-soft)" : undefined,
        color: tone === "good" || tone === "close" ? "#1f4a31" : tone === "mid" ? "#5c4300" : "#7d2a1e",
      }}
    >
      {xs.join("")}
    </span>
  );
  return (
    <div style={{ display: "flex", gap: 6, whiteSpace: "nowrap" }}>
      {chip(l.slice(0, 2), "good")}
      {chip(l.slice(2, 3), "close")}
      {chip(l.slice(3, 4), "mid")}
      {chip(l.slice(4), "bad")}
    </div>
  );
}
