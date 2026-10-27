import Link from "next/link";
import { commissionOf, loadAgreements } from "@/lib/adminData";
import { db } from "@/lib/db";
import { dateShort, money, refCode } from "@/lib/format";
import { commissionPercent } from "@/lib/settings";
import { formatInZone, COMPANY_TZ } from "@/lib/time";
import styles from "./admin.module.css";

// One rep's numbers: who they brought in, what it earned, and their commission.
export async function RepDashboard({ staffId, name, self, nowIso }: { staffId: string; name: string; self: boolean; nowIso: string }) {
  const [{ rows: agreements }, pct, { data: cands }, { data: calls }] = await Promise.all([
    loadAgreements(),
    commissionPercent(),
    db().from("candidates").select("id, full_name, status, headline, created_at").eq("added_by", staffId).order("created_at", { ascending: false }),
    db()
      .from("onboarding_calls")
      .select("id, starts_at, status, candidates(id, full_name)")
      .eq("staff_id", staffId)
      .order("starts_at", { ascending: true }),
  ]);
  const mine = (cands ?? []) as { id: string; full_name: string; status: string; headline: string | null; created_at: string }[];
  const count = (s: string) => mine.filter((c) => c.status === s).length;
  const callRows = (calls ?? []) as unknown as { id: string; starts_at: string; status: string; candidates: { id: string; full_name: string } }[];
  const upcoming = callRows.filter((c) => c.status === "booked" && c.starts_at >= nowIso);
  const callsDone = callRows.filter((c) => c.status === "done").length;

  // Hires credited to this rep.
  const hires = agreements
    .flatMap((a) =>
      a.hires
        .filter((h) => h.paid_at && (h.rep_id ? h.rep_id === staffId : a.candidates.added_by === staffId))
        .map((h) => ({ h, a })),
    )
    .sort((x, y) => (y.h.paid_at ?? "").localeCompare(x.h.paid_at ?? ""));
  const live = hires.filter(({ h }) => h.status === "paid" || h.status === "hired");
  const brought = live.reduce((s, { h }) => s + h.amount_cents, 0);
  const earned = live.reduce((s, { h }) => s + commissionOf(h, pct), 0);
  const paidOut = live.filter(({ h }) => h.commission_paid_at).reduce((s, { h }) => s + commissionOf(h, pct), 0);
  const owed = earned - paidOut;

  return (
    <>
      <div className="page-head" style={{ paddingBottom: 0 }}>
        <h1>{self ? `Hi, ${name.split(" ")[0]}` : name}</h1>
        <p>{self ? "Your candidates, your hires and your commission." : "This rep's candidates, hires and commission."}</p>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <strong>{mine.length}</strong>
          <span>Candidates brought in</span>
        </div>
        <div className={styles.stat}>
          <strong>{live.length}</strong>
          <span>Hired</span>
        </div>
        <div className={styles.stat}>
          <strong>{money(brought)}</strong>
          <span>Fees brought in</span>
        </div>
        <div className={styles.stat}>
          <strong>{money(earned)}</strong>
          <span>Commission earned</span>
        </div>
        <div className={`${styles.stat} ${owed ? styles.statActive : ""}`}>
          <strong>{money(owed)}</strong>
          <span>Still owed to {self ? "you" : "them"}</span>
        </div>
        <div className={styles.stat}>
          <strong>{money(paidOut)}</strong>
          <span>Paid out</span>
        </div>
      </div>

      <div className={styles.split}>
        <div className="panel">
          <h2 className={styles.h3}>Hires and commission</h2>
          {hires.length === 0 ? (
            <p className="small muted">
              No hires yet. When an owner hires one of {self ? "your" : "their"} candidates, it shows up here with the
              commission.
            </p>
          ) : (
            <table className="table" style={{ fontSize: 14 }}>
              <thead>
                <tr>
                  <th>Hired</th>
                  <th>By</th>
                  <th>Fee</th>
                  <th>Commission</th>
                </tr>
              </thead>
              <tbody>
                {hires.map(({ h, a }) => (
                  <tr key={h.id}>
                    <td>
                      <Link href={`/admin/candidates/${a.candidate_id}`}>{a.candidates.full_name}</Link>
                      <div className="small muted">
                        {refCode(a.candidate_id)}, {dateShort(h.paid_at)}
                      </div>
                    </td>
                    <td>{a.owners.company}</td>
                    <td>{money(h.amount_cents)}</td>
                    <td>
                      {h.status === "refunded" ? (
                        <span className="muted small">None (refunded)</span>
                      ) : (
                        <>
                          <strong>{money(commissionOf(h, pct))}</strong>{" "}
                          {h.commission_paid_at ? (
                            <span className="tag tag-good">Paid {dateShort(h.commission_paid_at)}</span>
                          ) : (
                            <span className="tag tag-gold">Owed</span>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="small muted" style={{ margin: "12px 0 0" }}>
            Commission is {pct}% of the fee unless agreed otherwise.
          </p>
        </div>
        <div className="panel">
          <h2 className={styles.h3}>{self ? "Your" : "Their"} candidates</h2>
          <ul className={styles.attention}>
            {[
              ["listed", "Listed"],
              ["draft", "Drafts"],
              ["paused", "Paused"],
              ["hired", "Hired"],
            ].map(([s, label]) => (
              <li key={s}>
                <span>{label}</span>
                <strong>{count(s)}</strong>
              </li>
            ))}
            <li>
              <span>Onboarding calls done</span>
              <strong>{callsDone}</strong>
            </li>
          </ul>
          {upcoming.length > 0 && (
            <>
              <h3 className={styles.h3} style={{ marginTop: 18, fontSize: 16 }}>
                Coming up
              </h3>
              <ul className={styles.attention}>
                {upcoming.slice(0, 4).map((c) => (
                  <li key={c.id}>
                    <Link href={`/admin/candidates/${c.candidates.id}`}>{c.candidates.full_name}</Link>
                    <span className="small">{formatInZone(c.starts_at, COMPANY_TZ, { weekday: "short", month: "short" })}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <h2 className={styles.h2}>Recently added</h2>
      {mine.length === 0 ? (
        <p className="panel panel-wash">
          No candidates yet. <Link href="/admin/candidates/new">Add one</Link>
        </p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <tbody>
              {mine.slice(0, 8).map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/candidates/${c.id}`}>{c.full_name}</Link>
                    <div className="small muted">{c.headline ?? "No profile yet"}</div>
                  </td>
                  <td>
                    <span className={`tag ${c.status === "listed" || c.status === "hired" ? "tag-good" : ""}`}>{c.status}</span>
                  </td>
                  <td className="small muted">Added {dateShort(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
