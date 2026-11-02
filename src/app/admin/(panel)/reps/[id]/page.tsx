import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { loadTeam, type CandRow } from "@/lib/teamView";
import { COMPANY_TZ, formatInZone } from "@/lib/time";
import { markCall } from "../../../actions";
import { MoveCallForm } from "../../calls/MoveCallForm";
import adminStyles from "../../admin.module.css";
import styles from "../reps.module.css";

export const dynamic = "force-dynamic";

// One rep's work: calls (with Move), what needs marking, and candidates by stage.
export default async function RepView({ params }: PageProps<"/admin/reps/[id]">) {
  const me = await requireStaff();
  if (!me.manager) redirect("/admin");
  const { id } = await params;
  const team = await loadTeam();
  const r = team.find((x) => x.id === id);
  if (!r) notFound();
  const { data: staff } = await db().from("staff").select("id, full_name, email").eq("active", true);
  const reps = ((staff ?? []) as { id: string; full_name: string | null; email: string }[]).map((s) => ({ id: s.id, name: s.full_name || s.email }));
  const when = (iso: string) => formatInZone(iso, COMPANY_TZ, { weekday: "short", month: "short" });
  const upcoming = r.calls.filter((k) => k.status === "booked" && Date.parse(k.ends_at) >= Date.now());

  const Stage = ({ title, rows }: { title: string; rows: CandRow[] }) => (
    <div className={styles.col}>
      <h3>
        {title} ({rows.length})
      </h3>
      {rows.length ? (
        <ul>
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/candidates/${c.id}`}>{c.full_name}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>None</p>
      )}
    </div>
  );

  return (
    <>
      <Link href="/admin/reps" className="small">
        All reps
      </Link>
      <div className="page-head" style={{ paddingBottom: 8 }}>
        <h1>{r.name}</h1>
        <p>
          {r.week.length} {r.week.length === 1 ? "call" : "calls"} this week · {r.hasHours ? `${r.openThisWeek} open times left this week` : "no hours set"}
        </p>
      </div>

      {r.needsMark.length > 0 && (
        <section className={styles.section}>
          <h2>Past calls to mark</h2>
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {r.needsMark.map((k) => (
                  <tr key={k.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{when(k.starts_at)}</td>
                    <td>
                      <Link href={`/admin/candidates/${k.candidates.id}`}>{k.candidates.full_name}</Link>
                    </td>
                    <td>
                      <div className={adminStyles.inline}>
                        <form action={markCall.bind(null, k.id, "done")}>
                          <button className="btn btn-small btn-ghost" type="submit">
                            Done
                          </button>
                        </form>
                        <form action={markCall.bind(null, k.id, "no_show")}>
                          <button className="btn btn-small btn-ghost" type="submit">
                            No-show
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h2>Coming up</h2>
        {upcoming.length ? (
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {upcoming.map((k) => (
                  <tr key={k.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{when(k.starts_at)}</td>
                    <td>
                      <Link href={`/admin/candidates/${k.candidates.id}`}>{k.candidates.full_name}</Link>
                      {k.candidates.added_by && k.candidates.added_by !== r.id && (
                        <div className="small" style={{ color: "var(--rust)", fontWeight: 600 }}>
                          {reps.find((x) => x.id === k.candidates.added_by)?.name ?? "Another rep"}&rsquo;s candidate
                        </div>
                      )}
                    </td>
                    <td>
                      <MoveCallForm callId={k.id} currentRep={r.id} reps={reps} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="panel panel-wash">No calls coming up.</p>
        )}
      </section>

      <section className={styles.section}>
        <h2>Candidates</h2>
        <p className="small muted" style={{ marginTop: -4, marginBottom: 12 }}>
          To move a candidate to another rep, open them and change Rep. You can choose whether to email them.
        </p>
        <div className={styles.cols}>
          <Stage title="New, no call yet" rows={r.stages.fresh} />
          <Stage title="Call booked" rows={r.stages.booked} />
          <Stage title="Spoken to, writing profile" rows={r.stages.drafting} />
          <Stage title="Listed" rows={r.stages.listed} />
          <Stage title="Hired" rows={r.stages.hired} />
        </div>
      </section>
    </>
  );
}
