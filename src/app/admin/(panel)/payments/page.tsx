import Link from "next/link";
import { ConfirmButton } from "@/components/ConfirmButton";
import { commissionOf, earnsCommission, HireRow, loadAgreements, repName, StaffLite } from "@/lib/adminData";
import { dateShort, money, refCode } from "@/lib/format";

import { receiptNumber } from "@/lib/receipt";
import { requireAdmin } from "@/lib/session";
import { commissionPercent } from "@/lib/settings";
import { markCommissionPaid, setCommissionAmount, setCommissionPercent, undoCommissionPaid } from "../../actions";
import styles from "../admin.module.css";
import { RefundButton } from "../RefundButton";

export const dynamic = "force-dynamic";

type Row = HireRow & {
  agreementId: string;
  candidateId: string;
  candidate: string;
  company: string;
  ownerName: string;
  rep?: StaffLite;
};

const VIEWS = [
  ["all", "All payments"],
  ["owed", "Commission owed"],
  ["paidout", "Commission paid out"],
  ["refunded", "Refunded"],
] as const;

export default async function PaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
  const sp = await searchParams;
  await requireAdmin();
  const [{ rows: agreements, error, people }, pct] = await Promise.all([loadAgreements(), commissionPercent()]);
  const view = typeof sp.view === "string" && VIEWS.some(([v]) => v === sp.view) ? sp.view : "all";
  const repFilter = typeof sp.rep === "string" ? sp.rep : "";

  // Every hire that was actually paid (refunded ones included, for the record).
  const all: Row[] = agreements
    .flatMap((a) =>
      a.hires
        .filter((h) => h.paid_at)
        .map((h) => ({
          ...h,
          agreementId: a.id,
          candidateId: a.candidate_id,
          candidate: a.candidates.full_name,
          company: a.owners.company ?? a.owners.email,
          ownerName: a.owners.full_name ?? "",
          rep: people.get(h.rep_id ?? a.candidates.added_by ?? ""),
        })),
    )
    .sort((a, b) => (b.paid_at ?? "").localeCompare(a.paid_at ?? ""));

  const live = all.filter((h) => h.status === "paid" || h.status === "hired");
  const gross = all.reduce((s, h) => s + h.amount_cents, 0);
  const refunded = all.filter((h) => h.status === "refunded").reduce((s, h) => s + h.amount_cents, 0);
  const earning = live.filter((h) => earnsCommission(h, h.rep));
  const owed = earning.filter((h) => !h.commission_paid_at);
  const paidOut = earning.filter((h) => h.commission_paid_at);
  const sum = (rs: Row[]) => rs.reduce((s, h) => s + commissionOf(h, pct, h.rep), 0);

  // Per-rep totals
  const reps = new Map<string, { rep: StaffLite; hires: number; owed: number; paid: number }>();
  for (const h of earning) {
    const r = reps.get(h.rep!.id) ?? { rep: h.rep!, hires: 0, owed: 0, paid: 0 };
    r.hires += 1;
    if (h.commission_paid_at) r.paid += commissionOf(h, pct, h.rep);
    else r.owed += commissionOf(h, pct, h.rep);
    reps.set(h.rep!.id, r);
  }

  let shown = all;
  if (view === "owed") shown = owed;
  if (view === "paidout") shown = paidOut;
  if (view === "refunded") shown = all.filter((h) => h.status === "refunded");
  if (repFilter) shown = shown.filter((h) => h.rep?.id === repFilter);

  const qs = (v: string, r = repFilter) => `/admin/payments?view=${v}${r ? `&rep=${r}` : ""}`;

  return (
    <>
      <div className="page-head" style={{ paddingBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1>Payments</h1>
          <p>Every fee collected, who was hired, which rep brought them in, and what you owe in commission.</p>
        </div>
        <a className="btn btn-ghost btn-small" href="/admin/payments-csv">
          Download for your accountant (CSV)
        </a>
      </div>
      {typeof sp.refunded === "string" && (
        <p className="notice notice-good" role="status">
          Refunded {sp.refunded}. The client was emailed, and the candidate is paused until you relist them.
        </p>
      )}
      {typeof sp.refund_error === "string" && (
        <p className="notice notice-bad" role="alert">
          The refund didn&rsquo;t go through: {sp.refund_error}
        </p>
      )}
      {error && (
        <p className="notice notice-bad" role="alert">
          Couldn&rsquo;t load payments: {error.message}
        </p>
      )}

      <div className={styles.stats}>
        <div className={styles.stat}>
          <strong>{money(gross - refunded)}</strong>
          <span>Collected, after refunds</span>
        </div>
        <div className={styles.stat}>
          <strong>{live.length}</strong>
          <span>Paid hires</span>
        </div>
        <Link className={`${styles.stat} ${owed.length ? styles.statActive : ""}`} href={qs("owed", "")}>
          <strong>{money(sum(owed))}</strong>
          <span>Commission owed ({owed.length})</span>
        </Link>
        <Link className={styles.stat} href={qs("paidout", "")}>
          <strong>{money(sum(paidOut))}</strong>
          <span>Commission paid out</span>
        </Link>
        <Link className={styles.stat} href={qs("refunded", "")}>
          <strong>{money(refunded)}</strong>
          <span>Refunded</span>
        </Link>
      </div>

      <div className={styles.split}>
        <div className="panel">
          <h2 className={styles.h3}>By rep</h2>
          {reps.size === 0 ? (
            <p className="small muted">No rep commissions yet. Hires of candidates you added yourself don&rsquo;t earn a commission.</p>
          ) : (
            <table className="table" style={{ fontSize: 14 }}>
              <thead>
                <tr>
                  <th>Rep</th>
                  <th>Hires</th>
                  <th>Owed</th>
                  <th>Paid out</th>
                </tr>
              </thead>
              <tbody>
                {[...reps.values()].map((r) => (
                  <tr key={r.rep.id}>
                    <td>
                      <Link href={qs("all", r.rep.id)}>{repName(r.rep)}</Link>
                      <div className="small">
                        <Link href={`/admin/team/${r.rep.id}`}>Their dashboard</Link>
                      </div>
                    </td>
                    <td>{r.hires}</td>
                    <td>{r.owed ? <strong>{money(r.owed)}</strong> : "—"}</td>
                    <td>{r.paid ? money(r.paid) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <form action={setCommissionPercent} className="panel">
          <h2 className={styles.h3}>Commission rate</h2>
          <p className="small muted" style={{ marginTop: 0 }}>
            The standard share of each fee for the rep who brought the candidate in. A rep can have their own terms (set
            on their page under Team), and you can change any single hire below.
          </p>
          <div className={styles.inline}>
            <input className="input" name="percent" defaultValue={pct} inputMode="decimal" aria-label="Commission percent" />
            <span>% of the fee</span>
            <button className="btn btn-small" type="submit">
              Save
            </button>
          </div>
        </form>
      </div>

      <div className={styles.tabs} style={{ marginTop: 28 }}>
        {VIEWS.map(([v, label]) => (
          <Link key={v} href={qs(v)} aria-current={v === view ? "page" : undefined}>
            {label}
          </Link>
        ))}
        {repFilter && (
          <Link href={qs(view, "")} aria-current="page">
            {repName(people.get(repFilter)) ?? "Rep"} ✕
          </Link>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="panel panel-wash">Nothing here yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Paid</th>
                <th>Hired</th>
                <th>By</th>
                <th>Fee</th>
                <th>Rep</th>
                <th>Commission</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((h) => {
                const earns = earnsCommission(h, h.rep);
                const amount = commissionOf(h, pct, h.rep);
                return (
                  <tr key={h.id}>
                    <td>
                      {dateShort(h.paid_at)}
                      <div className="small">
                        <Link href={`/account/receipts/${h.id}`}>{receiptNumber(h.id)}</Link>
                      </div>
                    </td>
                    <td>
                      <Link href={`/admin/candidates/${h.candidateId}`}>{h.candidate}</Link>
                      <div className="small muted">{refCode(h.candidateId)}</div>
                    </td>
                    <td>
                      {h.company}
                      <div className="small muted">{h.ownerName}</div>
                    </td>
                    <td>
                      {money(h.amount_cents)}
                      <div className="small" style={{ display: "grid", gap: 6, justifyItems: "start" }}>
                        {h.status === "refunded" ? (
                          <span className="tag tag-bad">Refunded {dateShort(h.refunded_at)}</span>
                        ) : h.status === "hired" ? (
                          <span className="tag tag-good">Hired</span>
                        ) : (
                          <span className="tag tag-good">Paid</span>
                        )}
                        {h.status !== "refunded" && (
                          <RefundButton hireId={h.id} amount={money(h.amount_cents)} company={h.company} back="/admin/payments" />
                        )}
                      </div>
                    </td>
                    <td>{repName(h.rep) ?? <span className="muted">Applied online</span>}</td>
                    <td>
                      {!earns ? (
                        <span className="muted small">{h.status === "refunded" ? "None (refunded)" : "None"}</span>
                      ) : h.commission_paid_at ? (
                        <div>
                          <strong>{money(amount)}</strong>{" "}
                          <span className="tag tag-good">Paid out {dateShort(h.commission_paid_at)}</span>
                          {h.commission_note && <div className="small muted">{h.commission_note}</div>}
                          <form action={undoCommissionPaid.bind(null, h.id)} style={{ marginTop: 4 }}>
                            <button className="linkish small" style={{ marginTop: 0 }} type="submit">
                              Undo
                            </button>
                          </form>
                        </div>
                      ) : (
                        <div style={{ display: "grid", gap: 6 }}>
                          <form action={setCommissionAmount.bind(null, h.id)} className={styles.inline}>
                            <input
                              className="input"
                              name="amount"
                              defaultValue={(amount / 100).toFixed(0)}
                              aria-label="Commission in dollars"
                              style={{ width: 90 }}
                            />
                            <button className="btn btn-small btn-ghost" type="submit" title="Save a different amount for this hire">
                              Set
                            </button>
                            <span className="tag tag-gold">Owed</span>
                          </form>
                          <form action={markCommissionPaid.bind(null, h.id)} className={styles.inline}>
                            <input className="input" name="note" placeholder="Note, e.g. Zelle" aria-label="Payment note" style={{ width: 130 }} />
                            <ConfirmButton
                              className="btn btn-small"
                              message={`Mark ${money(amount)} as paid out to ${repName(h.rep)}?`}
                            >
                              Mark paid out
                            </ConfirmButton>
                          </form>
                        </div>
                      )}
                    </td>
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
