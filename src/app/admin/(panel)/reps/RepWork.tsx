import Link from "next/link";
import { alertsFor, type CandRow, type RepSummary } from "@/lib/teamView";
import { COMPANY_TZ, formatInZone } from "@/lib/time";
import { markCall } from "../../actions";
import { MoveCallForm } from "../calls/MoveCallForm";
import adminStyles from "../admin.module.css";
import styles from "./reps.module.css";

function Stage({ title, rows, hint }: { title: string; rows: CandRow[]; hint?: string }) {
  return (
    <div className={styles.col}>
      <h3>
        {title} <span className={styles.count}>{rows.length}</span>
      </h3>
      {hint && rows.length > 0 && <p className={styles.hint}>{hint}</p>}
      {rows.length ? (
        <ul>
          {rows.slice(0, 12).map((c) => (
            <li key={c.id}>
              <Link prefetch={false} href={`/admin/candidates/${c.id}`}>{c.full_name}</Link>
            </li>
          ))}
          {rows.length > 12 && <li className={styles.empty}>and {rows.length - 12} more</li>}
        </ul>
      ) : (
        <p className={styles.empty}>None</p>
      )}
    </div>
  );
}

// One rep's day-to-day work, the same for the rep's own dashboard and the manager's view:
// numbers, what needs doing, calls coming up, and candidates by stage.
export function RepWork({ r, self, reps, canMove = false }: { r: RepSummary; self: boolean; reps?: { id: string; name: string }[]; canMove?: boolean }) {
  const when = (iso: string) => formatInZone(iso, COMPANY_TZ, { weekday: "short", month: "short" });
  const alerts = alertsFor(r, self);
  const repName = (id: string) => reps?.find((x) => x.id === id)?.name ?? "another rep";

  return (
    <>
      <div className={styles.today}>
        <div className={styles.nums4}>
          <div className={styles.num}>
            <b>{r.today.length}</b>
            <span>calls today</span>
          </div>
          <div className={styles.num}>
            <b>{r.week.length}</b>
            <span>calls this week</span>
          </div>
          <div className={styles.num}>
            <b>{r.hasHours ? r.openThisWeek : "–"}</b>
            <span>open times left</span>
          </div>
          <div className={styles.num}>
            <b>{r.stages.listed.length}</b>
            <span>listed now</span>
          </div>
        </div>
        <div className={styles.todo}>
          <h2>{self ? "Your to-do" : "Needs attention"}</h2>
          <ul className={styles.alerts}>
            {alerts.map((a) => (
              <li key={a.text} className={styles[a.tone]}>
                {a.href ? <a href={a.href}>{a.text} →</a> : a.text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {r.needsMark.length > 0 && (
        <section className={styles.section} id="mark">
          <h2>Past calls to mark</h2>
          <p className={styles.sub}>Did the call happen? One click each.</p>
          <ul className={styles.rows}>
            {r.needsMark.map((k) => (
              <li key={k.id}>
                <span className={styles.when}>{when(k.starts_at)}</span>
                <Link prefetch={false} href={`/admin/candidates/${k.candidates.id}`} className={styles.who}>
                  {k.candidates.full_name}
                </Link>
                <div className={adminStyles.inline}>
                  <form action={markCall.bind(null, k.id, "done")}>
                    <button className="btn btn-small" type="submit">
                      Done
                    </button>
                  </form>
                  <form action={markCall.bind(null, k.id, "no_show")}>
                    <button className="btn btn-small btn-ghost" type="submit">
                      No-show
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.section}>
        <h2>Calls coming up</h2>
        {r.upcoming.length > 0 && (
          <p className={styles.sub}>
            {self ? "Join" : "They join"} signed in to Google as <b>{r.callEmail}</b>. The call records by itself once {self ? "you're" : "they're"} in with that account.
          </p>
        )}
        {r.upcoming.length ? (
          <ul className={styles.rows}>
            {r.upcoming.map((k) => (
              <li key={k.id}>
                <span className={styles.when}>{when(k.starts_at)}</span>
                <span className={styles.who}>
                  <Link prefetch={false} href={`/admin/candidates/${k.candidates.id}`}>{k.candidates.full_name}</Link>
                  {k.candidates.added_by && k.candidates.added_by !== r.id && (
                    <span className={styles.flag}>{repName(k.candidates.added_by)}&rsquo;s candidate</span>
                  )}
                </span>
                <span className={styles.actions}>
                  {k.meet_link && (
                    <a className="btn btn-small btn-ghost" href={k.meet_link} target="_blank" rel="noreferrer" title={`Join signed in to Google as ${r.callEmail}, so the call records.`}>
                      Join call
                    </a>
                  )}
                  {canMove && reps && <MoveCallForm callId={k.id} currentRep={r.id} reps={reps} />}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="panel panel-wash">
            No calls coming up.{" "}
            {self && (
              <>
                Share your link from the <Link href="/admin/share">Share kit</Link> to get people booking.
              </>
            )}
          </p>
        )}
      </section>

      <section className={styles.section} id="stages">
        <h2>{self ? "Your candidates" : "Candidates"}</h2>
        {canMove && <p className={styles.sub}>To move a candidate to another rep, open them and change Rep. You can choose whether to email them.</p>}
        <div className={styles.cols}>
          <Stage title="New, no call yet" rows={r.stages.fresh} hint={self ? "Send a reminder from their page" : undefined} />
          <Stage title="Call booked" rows={r.stages.booked} />
          <Stage title="Spoken to, profile to finish" rows={r.stages.drafting} hint={self ? "Finish and list these" : undefined} />
          <Stage title="Listed" rows={r.stages.listed} />
          <Stage title="Hired" rows={r.stages.hired} />
        </div>
      </section>
    </>
  );
}
