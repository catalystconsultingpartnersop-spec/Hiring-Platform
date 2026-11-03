import Link from "next/link";
import { db, PUBLIC_CANDIDATE_COLUMNS, type PublicCandidate } from "@/lib/db";
import { positionsFor } from "@/lib/matching";
import { openPositions, positionsReady } from "@/lib/positions";

// One quiet, folded line on a candidate's page: the open positions they fit, and why.
export async function PositionsTheyFit({ candidateId, status }: { candidateId: string; status: string }) {
  if (status === "archived" || status === "hired" || !(await positionsReady())) return null;
  const [{ data }, positions] = await Promise.all([db().from("candidates").select(PUBLIC_CANDIDATE_COLUMNS).eq("id", candidateId).maybeSingle(), openPositions()]);
  if (!data || !positions.length) return null;
  const fits = positionsFor(data as unknown as PublicCandidate, positions, 8);
  if (!fits.length) return null;
  return (
    <details className="panel" style={{ marginTop: 16 }}>
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>
        Fits {fits.length} open position{fits.length === 1 ? "" : "s"}
      </summary>
      <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0" }}>
        {fits.map(({ p, m }) => (
          <li key={p.id} style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
            <span className={`tag ${m.fit === "strong" ? "tag-good" : "tag-gold"}`} style={{ marginRight: 8 }}>
              {m.fit === "strong" ? "Strong" : "Good"}
            </span>
            <Link prefetch={false} href={`/admin/matches/${p.id}`}>
              <b>{p.title}</b>
              {p.company ? ` at ${p.company}` : ""}
            </Link>
            <div className="small muted" style={{ marginTop: 2 }}>
              {m.why.join(" · ")}
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
