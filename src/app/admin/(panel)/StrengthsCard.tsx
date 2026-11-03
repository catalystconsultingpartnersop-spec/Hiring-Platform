import { db } from "@/lib/db";
import { summarize } from "@/lib/assessment";
import { candidateUrl } from "@/lib/format";
import { effectiveReps } from "@/lib/reps";
import { CopyLink } from "./CopyLink";

// On a rep's dashboard: take our strengths assessment, send it to a candidate, and see
// the results of their own candidates (matched by email).
export async function StrengthsCard({ staffId }: { staffId: string }) {
  const link = `${candidateUrl()}/strengths`;
  const [{ data: taken }, { data: cands }] = await Promise.all([
    db().from("activity_log").select("at, details").eq("action", "assessment_taken").order("at", { ascending: false }).limit(500),
    db().from("candidates").select("id, full_name, email, added_by").neq("status", "archived"),
  ]);
  const owners = await effectiveReps(((cands ?? []) as { id: string; added_by: string | null }[]).map((c) => ({ id: c.id, added_by: c.added_by })));
  const mine = new Map(
    ((cands ?? []) as { id: string; full_name: string; email: string }[])
      .filter((c) => owners.get(c.id)?.id === staffId && c.email)
      .map((c) => [c.email.toLowerCase(), c] as const),
  );
  const seen = new Set<string>();
  const results = ((taken ?? []) as { details: { email?: string; result: unknown } }[])
    .map((r) => ({ c: mine.get((r.details.email ?? "").toLowerCase()), result: r.details.result }))
    .filter((x) => x.c && !seen.has(x.c.id) && seen.add(x.c.id))
    .slice(0, 12);
  const wa = `https://wa.me/?text=${encodeURIComponent(`Here's a short assessment that shows what you're naturally great at. It takes a few minutes: ${link}`)}`;
  return (
    <section className="panel" style={{ marginTop: 18 }}>
      <p className="small muted" style={{ margin: "0 0 12px" }}>
        Send it to anyone else, or take it yourself.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a className="btn btn-gold btn-small" href={link} target="_blank" rel="noreferrer">
          Take it yourself
        </a>
        <a className="btn btn-ghost btn-small" href={wa} target="_blank" rel="noreferrer">
          Send on WhatsApp
        </a>
        <CopyLink link={link} />
      </div>
      <h3 style={{ fontSize: 15, margin: "16px 0 6px" }}>Your candidates&rsquo; results</h3>
      {results.length ? (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {results.map(({ c, result }) => (
            <li key={c!.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", padding: "8px 0", borderTop: "1px solid var(--line)" }}>
              <a href={`/admin/candidates/${c!.id}`}>
                <b>{c!.full_name}</b>
              </a>
              <span className="small muted">{summarize(result)?.top.join(" + ")}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="small muted" style={{ margin: 0 }}>
          None yet. When your candidates take it with the email they gave us, their results show up here.
        </p>
      )}
    </section>
  );
}
