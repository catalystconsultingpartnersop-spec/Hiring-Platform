import { requireStaff } from "@/lib/session";
import { StrengthsCard } from "../StrengthsCard";
import { db } from "@/lib/db";
import { summarize } from "@/lib/assessment";
import { candidateUrl } from "@/lib/format";

type Row = { id: number; at: string; details: { name: string; email?: string; result: unknown } };

export default async function AssessmentsPage() {
  const me = await requireStaff();
  if (me.role !== "admin")
    return (
      <>
        <div className="page-head" style={{ paddingBottom: 0 }}>
          <h1>Strengths Assessment</h1>
          <p>Our own. Candidates get it automatically when they book, and their results land on their profile.</p>
        </div>
        {me.id && <StrengthsCard staffId={me.id} />}
      </>
    );
  const { data } = await db()
    .from("activity_log")
    .select("id, at, details")
    .eq("action", "assessment_taken")
    .order("at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Row[];
  const link = `${candidateUrl()}/strengths`;
  return (
    <>
      <div className="page-head" style={{ paddingBottom: 8 }}>
        <h1>Strengths Assessment</h1>
        <p>
          Our own assessment. Send people this link: <a href={link}>{link}</a>. Every result shows up here, and you get an
          email each time.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="muted">No one has taken it yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Result</th>
                <th>Natural strengths</th>
                <th>Can do well</th>
                <th>Wears them down</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const x = summarize(r.details.result);
                if (!x) return null;
                return (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {new Date(r.at).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td>
                      <strong>{r.details.name}</strong>
                      {r.details.email ? <div className="small muted">{r.details.email}</div> : null}
                    </td>
                    <td style={{ whiteSpace: "nowrap", fontWeight: 700 }}>
                      {x.letters ? `${x.letters.slice(0, 2)} / ${x.letters.slice(2, 4)} / ${x.letters.slice(4)}` : <span className="small muted">Earlier version</span>}
                    </td>
                    <td><strong>{x.top.join(" + ")}</strong></td>
                    <td>{x.mid.join(", ")}</td>
                    <td>{x.low.join(", ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
