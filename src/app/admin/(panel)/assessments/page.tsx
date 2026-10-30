import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { Result, STRENGTHS } from "@/lib/assessment";
import { candidateUrl } from "@/lib/format";

type Row = { id: number; at: string; details: { name: string; email?: string; result: Result } };

export default async function AssessmentsPage() {
  await requireAdmin();
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
        <h1>Strengths assessment (pilot)</h1>
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
                <th>Natural strengths</th>
                <th>Also strong</th>
                <th>Drains them</th>
                <th>Could shine in</th>
                <th>Work style</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const x = r.details.result;
                return (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {new Date(r.at).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td>
                      <strong>{r.details.name}</strong>
                      {r.details.email ? <div className="small muted">{r.details.email}</div> : null}
                    </td>
                    <td><strong>{x.top.map((k) => STRENGTHS[k].name).join(" + ")}</strong></td>
                    <td>{x.next.map((k) => STRENGTHS[k].name).join(", ")}</td>
                    <td>{x.low.map((k) => STRENGTHS[k].name).join(", ")}</td>
                    <td>{x.roles.join(", ")}</td>
                    <td className="small">{x.style.map((s) => s.text).join("; ")}</td>
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
