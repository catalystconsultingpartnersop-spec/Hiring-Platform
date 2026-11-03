import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/session";
import { findFloaters, type Floater } from "@/lib/floaters";
import { loadTeam } from "@/lib/teamView";
import { COMPANY_TZ, formatInZone } from "@/lib/time";
import styles from "./reps.module.css";

export const metadata: Metadata = { title: "Team" };
export const dynamic = "force-dynamic";

// The manager's home: every rep's work at a glance. No money here.
export default async function Team() {
  const me = await requireStaff();
  if (!me.manager) redirect("/admin");
  const [team, floaters] = await Promise.all([loadTeam(), findFloaters()]);
  const loose: Floater[] = [...floaters.noRep, ...floaters.noCall.filter((f) => f.rep)];
  const totals = {
    today: team.reduce((n, r) => n + r.today.length, 0),
    week: team.reduce((n, r) => n + r.week.length, 0),
    attention: team.reduce((n, r) => n + r.needsMark.length + r.talkedNotListed.length + (r.openThisWeek === 0 ? 1 : 0), 0),
  };
  return (
    <>
      <div className="page-head" style={{ paddingBottom: 8 }}>
        <h1>Team</h1>
        <p>
          {totals.today} {totals.today === 1 ? "call" : "calls"} today · {totals.week} this week ·{" "}
          {totals.attention ? `${totals.attention} ${totals.attention === 1 ? "thing needs" : "things need"} attention` : "nothing needs attention"}
        </p>
      </div>
      {loose.length > 0 && (
        <section className={styles.floaters}>
          <h2>No floaters: {loose.length} {loose.length === 1 ? "candidate needs" : "candidates need"} a rep or a call</h2>
          <ul>
            {loose.map((f) => (
              <li key={f.id + f.why}>
                <Link prefetch={false} href={`/admin/candidates/${f.id}`}>{f.name}</Link>
                <span>
                  {f.why}
                  {f.rep ? ` · rep: ${f.rep}` : ""}
                  {f.callWith ? ` · call with ${f.callWith}, ${f.callAt}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className={styles.grid}>
        {team.map((r) => {
          const alerts: [string, string][] = [];
          if (!r.hasHours) alerts.push([styles.bad, "No hours set, so candidates can't book them"]);
          else if (r.openThisWeek === 0) alerts.push([styles.bad, "Fully booked this week: no open times left"]);
          else if (r.openThisWeek <= 2) alerts.push([styles.warn, `Only ${r.openThisWeek} open ${r.openThisWeek === 1 ? "time" : "times"} left this week`]);
          if (r.needsMark.length) alerts.push([styles.warn, `${r.needsMark.length} past ${r.needsMark.length === 1 ? "call" : "calls"} not marked Done or No-show`]);
          if (r.talkedNotListed.length) alerts.push([styles.warn, `${r.talkedNotListed.length} spoken to but not listed yet`]);
          if (!alerts.length) alerts.push([styles.ok, "All good"]);
          return (
            <Link prefetch={false} key={r.id} href={`/admin/reps/${r.id}`} className={styles.card}>
              <div className={styles.head}>
                <h2>{r.name}</h2>
                {r.partner && <span className="tag tag-gold">Partner</span>}
              </div>
              <div className={styles.nums}>
                <div className={styles.num}>
                  <b>{r.today.length}</b>
                  <span>calls today</span>
                </div>
                <div className={styles.num}>
                  <b>{r.week.length}</b>
                  <span>this week</span>
                </div>
                <div className={styles.num}>
                  <b>{r.hasHours ? r.openThisWeek : "–"}</b>
                  <span>open times left</span>
                </div>
              </div>
              <p className={styles.next}>
                {r.next ? (
                  <>
                    Next: <strong>{r.next.candidates.full_name}</strong>, {formatInZone(r.next.starts_at, COMPANY_TZ, { weekday: "short", month: "short" })}
                  </>
                ) : (
                  "No calls coming up"
                )}
              </p>
              <ul className={styles.alerts}>
                {alerts.map(([cls, text]) => (
                  <li key={text} className={cls}>
                    {text}
                  </li>
                ))}
              </ul>
              <div className={styles.stages}>
                <span className={styles.stage}>{r.stages.fresh.length} new</span>
                <span className={styles.stage}>{r.stages.booked.length} call booked</span>
                <span className={styles.stage}>{r.stages.drafting.length} writing profile</span>
                <span className={styles.stage}>{r.stages.listed.length} listed</span>
                <span className={styles.stage}>{r.stages.hired.length} hired</span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
