import { hiddenStaffIds } from "@/lib/hiddenStaff";
import { isCheckAccount } from "@/lib/session";
import Link from "next/link";
import { commissionOf, commissionTerms, finderSharesFor, loadAgreements } from "@/lib/adminData";
import { FINDER_PCT, HOW_LABEL } from "@/lib/finder";
import { db } from "@/lib/db";
import { dateShort, money, refCode } from "@/lib/format";

import { commissionPercent } from "@/lib/settings";
import { loadRep } from "@/lib/teamView";
import { RepWork } from "./reps/RepWork";
import repStyles from "./reps/reps.module.css";
import styles from "./admin.module.css";
import { Introductions } from "./Introductions";
import { MessagesWaiting } from "./MessagesWaiting";

// A rep's home: today's work and to-do first, then their candidates, then what they've earned.
export async function RepDashboard({ staffId, name, self, nowIso }: { staffId: string; name: string; self: boolean; nowIso: string }) {
  const [{ rows: agreements, people }, pct, work, { data: staff }] = await Promise.all([
    loadAgreements(),
    commissionPercent(),
    loadRep(staffId),
    db().from("staff").select("id, full_name, email, role, agreement_signed_at").eq("active", true),
  ]);
  const hidden = await hiddenStaffIds();
  const staffList = ((staff ?? []) as { id: string; full_name: string | null; email: string; role: string; agreement_signed_at: string | null }[]).filter((s) => !isCheckAccount(s.email) && !hidden.has(s.id) && (s.role === "admin" || !!s.agreement_signed_at)).map((s) => ({ id: s.id, name: s.full_name || s.email }));

  // Hires credited to this rep.
  const hires = agreements
    .flatMap((a) =>
      a.hires
        .filter((h) => h.paid_at && (h.rep_id ? h.rep_id === staffId : a.candidates.added_by === staffId))
        .map((h) => ({ h, a })),
    )
    .sort((x, y) => (y.h.paid_at ?? "").localeCompare(x.h.paid_at ?? ""));
  const live = hires.filter(({ h }) => h.status === "paid" || h.status === "hired");
  const me = people.get(staffId);
  // Finder's shares: owners this rep found, on anyone's candidate.
  const allShares = await finderSharesFor(agreements);
  const found = agreements.flatMap((a) => a.hires.filter((h) => allShares.get(h.id)?.staffId === staffId).map((h) => ({ h, a, f: allShares.get(h.id)! })));
  const earned = live.reduce((s, { h }) => s + commissionOf(h, pct, me), 0) + found.reduce((s, x) => s + x.f.cents, 0);
  const paidOut =
    live.filter(({ h }) => h.commission_paid_at).reduce((s, { h }) => s + commissionOf(h, pct, me), 0) +
    found.filter((x) => x.f.paidAt).reduce((s, x) => s + x.f.cents, 0);
  const owed = earned - paidOut;
  const myPhone = self ? ((await (await import("@/lib/staffPhones")).staffPhones())[staffId] ?? null) : null;

  return (
    <>
      <div className="page-head" style={{ paddingBottom: 0 }}>
        <h1>{self ? `Hi, ${name.split(" ")[0]}` : name}</h1>
        <p>
          {self ? "Your calls, your candidates and what you've earned." : "This rep's calls, candidates and commission."}
          {self && (
            <>
              {" "}
              New here? <Link href="/admin/guide">Read the rep guide</Link> (3 minutes).
            </>
          )}
        </p>
      </div>
      {self && !myPhone && (
        <p className="notice notice-gold" style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span>
            <strong>Add your mobile number</strong> so we can text you about bookings and your candidates.
          </span>
          <Link className="btn btn-small" href="/admin/hours#phone">
            Add it
          </Link>
        </p>
      )}
      {self && myPhone && (
        <p className="notice notice-gold" style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span>
            <strong>New:</strong> the Team Room, Suggest a candidate, the ⭐ gold badge, and a 5% introduction share.
          </span>
          <Link className="btn btn-small" href="/admin/guide#new">
            See what&rsquo;s new
          </Link>
        </p>
      )}


      {self && <MessagesWaiting staffId={staffId} />}

      {work && <RepWork r={work} self={self} reps={staffList} canMove={!self} owed={money(owed)} />}

      <section style={{ marginTop: 32 }} id="earnings">
        <h2 className={styles.h2} style={{ marginTop: 0 }}>
          {self ? "Your earnings" : "Their earnings"}
        </h2>
        <div className={repStyles.money}>
          <div className={styles.stat}>
            <strong>{live.length}</strong>
            <span>{live.length === 1 ? "Hire" : "Hires"}</span>
          </div>
          <div className={styles.stat}>
            <strong>{money(earned)}</strong>
            <span>Commission earned</span>
          </div>
          <div className={`${styles.stat} ${owed ? styles.statActive : ""}`}>
            <strong>{money(owed)}</strong>
            <span>Still owed to {self ? "you" : "them"}</span>
          </div>
        </div>
        <details className="panel" style={{ marginTop: 12 }} open={hires.length > 0 && hires.length <= 3}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>
            {hires.length ? `Every hire (${hires.length})` : "Hires"} · {money(paidOut)} paid out so far
          </summary>
          <div style={{ marginTop: 12 }}>
          {hires.length + found.length === 0 ? (
            <p className="small muted">
              No hires yet. When a client hires one of {self ? "your" : "their"} candidates, it shows up here with the
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
                      <Link prefetch={false} href={`/admin/candidates/${a.candidate_id}`}>{a.candidates.full_name}</Link>
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
                          <strong>{money(commissionOf(h, pct, me))}</strong>{" "}
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
                {found.map(({ h, a, f }) => (
                  <tr key={`f-${h.id}`}>
                    <td>
                      <Link prefetch={false} href={`/admin/candidates/${a.candidate_id}`}>{a.candidates.full_name}</Link>
                      <div className="small muted">
                        Finder&rsquo;s share: {HOW_LABEL[f.how]}
                      </div>
                    </td>
                    <td>{a.owners.company}</td>
                    <td>{money(h.amount_cents)}</td>
                    <td>
                      <strong>{money(f.cents)}</strong> {f.paidAt ? <span className="tag tag-good">Paid {dateShort(f.paidAt)}</span> : <span className="tag tag-gold">Owed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="small muted" style={{ margin: "12px 0 0" }}>
            {self ? "Your" : "Their"} commission: {commissionTerms(me, pct)}, unless agreed otherwise for a hire. Plus a {FINDER_PCT}% introduction share when the site records that {self ? "you" : "they"} introduced the business owner who hires (Suggest, or {self ? "your" : "their"} link), on anyone&rsquo;s candidate.
          </p>
          </div>
        </details>
      </section>

      <Introductions rows={agreements.filter((a) => a.candidates.added_by === staffId)} now={Date.parse(nowIso)} title={self ? "Your candidates' introductions" : "Introductions in progress"} />

    </>
  );
}
