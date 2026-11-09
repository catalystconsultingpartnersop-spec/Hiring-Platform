import { openRepCalls } from "@/lib/repCalls";
import { refCode } from "@/lib/format";
import { PendingButton } from "@/components/PendingButton";
import { markRepCallDone } from "./repCallActions";
import { nowMs } from "@/lib/time";

// Owners who asked for a free 10-minute call and haven't been called yet.
export async function RepCallsWaiting({ staffId, all = false }: { staffId: string | null; all?: boolean }) {
  const rows = await openRepCalls(all ? null : staffId).catch(() => []);
  if (!rows.length) return null;
  const now = nowMs();
  const ago = (iso: string) => {
    const h = Math.round((now - Date.parse(iso)) / 36e5);
    return h < 1 ? "just now" : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
  };
  return (
    <div className="panel rep-calls-waiting" style={{ marginTop: 16 }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 19 }}>
        📞 {rows.length === 1 ? "An owner is" : `${rows.length} owners are`} waiting for {all ? "a rep's" : "your"} call
      </h2>
      <p className="small muted" style={{ margin: "0 0 10px" }}>
        Free 10-minute call about one of {all ? "our" : "your"} candidates. Don&rsquo;t share the candidate&rsquo;s name or number yet.
      </p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
        {rows.map((r) => (
          <li key={r.id} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", borderTop: "1px solid var(--line)", paddingTop: 10 }}>
            <div style={{ flex: "1 1 260px" }}>
              <strong>
                {r.name}
                {r.company ? `, ${r.company}` : ""}
              </strong>{" "}
              · <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`}>{r.phone}</a> · {r.when.toLowerCase()}
              <div className="small muted">
                About {r.headline ?? "a candidate"} ({refCode(r.candidate_id)}) · asked {ago(r.at)}
                {r.note ? ` · “${r.note}”` : ""}
              </div>
            </div>
            <form action={markRepCallDone.bind(null, r.id)}>
              <PendingButton className="btn btn-small" pendingText="Saving…">
                Called ✓
              </PendingButton>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
