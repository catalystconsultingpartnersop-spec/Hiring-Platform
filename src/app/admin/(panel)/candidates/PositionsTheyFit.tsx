import Link from "next/link";
import { db, PUBLIC_CANDIDATE_COLUMNS, type PublicCandidate } from "@/lib/db";
import { positionsFor } from "@/lib/matching";
import { hiddenMatches, pairKey } from "@/lib/matchHidden";
import { judgedMatches } from "@/lib/matchJudge";
import { aiMatches } from "@/lib/aiMatch";
import { manualMatches } from "@/lib/openings";
import { addPick } from "../matches/actions";
import { TalkBox } from "../TalkBox";
import { openPositions, positionsReady } from "@/lib/positions";

// One quiet, folded line on a candidate's page: the open positions they fit, and why.
export async function PositionsTheyFit({ candidateId, status }: { candidateId: string; status: string }) {
  if (status === "archived" || status === "hired" || !(await positionsReady())) return null;
  const [{ data }, positions] = await Promise.all([db().from("candidates").select(PUBLIC_CANDIDATE_COLUMNS).eq("id", candidateId).maybeSingle(), openPositions()]);
  if (!data || !positions.length) return null;
  const [hidden, judged, ai, manual] = await Promise.all([hiddenMatches(), judgedMatches(), aiMatches(), manualMatches()]);
  const open = positions.filter((p) => !hidden[pairKey(p.id, candidateId)]);
  // The AI's picks for openings it has checked; the old word-matching for the rest.
  const byHand = open.flatMap((p) => (manual[p.id] ?? []).filter((x) => x.id === candidateId).map((x) => ({ p, m: { score: 0, fit: "strong" as const, why: [x.why ? `${x.by}: ${x.why}` : `Picked by ${x.by}`] } })));
  const picked = open.flatMap((p) => (ai[p.id]?.list ?? []).filter((x) => x.id === candidateId).map((x) => ({ p, m: { score: 0, fit: x.fit, why: [x.why] } })));
  const handIds = new Set(byHand.map((x) => x.p.id));
  const fits = [...byHand, ...picked.filter((x) => !handIds.has(x.p.id)), ...positionsFor(data as unknown as PublicCandidate, open.filter((p) => !ai[p.id] && judged[pairKey(p.id, candidateId)]?.v !== "no"), 8)].slice(0, 8);
  const others = open.filter((p) => !fits.some((f) => f.p.id === p.id));
  return (
    <details className="panel" style={{ marginTop: 16 }}>
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>
        {fits.length ? `Fits ${fits.length} opening${fits.length === 1 ? "" : "s"}` : "Openings: suggest them for one"}
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
              {(!ai[p.id] && judged[pairKey(p.id, candidateId)]?.why) || m.why.join(" · ")}
            </div>
          </li>
        ))}
      </ul>
      {others.length > 0 && (
        <form action={async (f: FormData) => {
          "use server";
          await addPick(String(f.get("position")), f);
        }} style={{ display: "grid", gap: 8, marginTop: 12, maxWidth: 560 }}>
          <input type="hidden" name="candidate" value={candidateId} />
          <b className="small">Think they fit another opening?</b>
          <select className="select" name="position" required defaultValue="">
            <option value="" disabled>
              Pick an opening
            </option>
            {others.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
                {p.company ? ` · ${p.company}` : ""}
              </option>
            ))}
          </select>
          <TalkBox name="why" rows={2} placeholder="Why they fit (optional). Type or tap Speak." />
          <button className="btn btn-ghost btn-small" type="submit" style={{ justifySelf: "start" }}>
            Suggest for this opening
          </button>
        </form>
      )}
    </details>
  );
}
