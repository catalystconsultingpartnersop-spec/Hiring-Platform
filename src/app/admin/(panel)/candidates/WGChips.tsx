import { parseResult } from "@/lib/strengths";

const NAME: Record<string, string> = { W: "Wonder", I: "Invention", D: "Discernment", G: "Galvanizing", E: "Enablement", T: "Tenacity" };

// A candidate's Working Genius at a glance (team only): their two geniuses and two frustrations.
export function WGChips({ result, uploaded, tried }: { result: string | null; uploaded: boolean; tried: boolean }) {
  const l = parseResult(result);
  if (l.length < 6) {
    if (!uploaded) return <span className="small muted">Not uploaded</span>;
    return <span className="small muted">{tried ? "Uploaded, couldn't read it. Open to add" : "Uploaded, reading…"}</span>;
  }
  const chip = (x: string, good: boolean) => (
    <span
      key={x}
      title={NAME[x]}
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 99,
        fontSize: 12.5,
        fontWeight: 700,
        background: good ? "var(--moss-soft)" : "var(--rust-soft)",
        color: good ? "#1f4a31" : "#7d2a1e",
        whiteSpace: "nowrap",
      }}
    >
      {NAME[x]}
    </span>
  );
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{l.slice(0, 2).map((x) => chip(x, true))}</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }} aria-label="Frustrations">
        {l.slice(4).map((x) => chip(x, false))}
      </div>
    </div>
  );
}
