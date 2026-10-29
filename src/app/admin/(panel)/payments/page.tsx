import Link from "next/link";
import { ConfirmButton } from "@/components/ConfirmButton";
import { commissionOf, commissionTerms, earnsCommission, HireRow, loadAgreements, repName, StaffLite, stageOf } from "@/lib/adminData";
import { db } from "@/lib/db";
import { isOwnerEmail } from "@/lib/session";
import { dateShort, money, refCode } from "@/lib/format";

import { receiptNumber } from "@/lib/receipt";
import { requireAdmin } from "@/lib/session";
import { commissionPercent } from "@/lib/settings";
import { deleteExpense, markCommissionPaid, payRepAll, setCommissionAmount, undoCommissionPaid } from "../../actions";
import { CommissionRateForm } from "./CommissionRateForm";
import { ExpenseForm } from "./ExpenseForm";
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
  ["all", "All"],
  ["owed", "Commission owed"],
  ["paidout", "Commission paid out"],
  ["refunded", "Refunded"],
] as const;

export default async function PaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
  const sp = await searchParams;
  await requireAdmin();
  const [{ rows: agreements, error, people }, pct, { data: expRows, error: expErr }] = await Promise.all([
    loadAgreements(),
    commissionPercent(),
    db().from("expenses").select("*").order("spent_on", { ascending: false }),
  ]);
  type Expense = { id: string; spent_on: string; what: string; category: string; amount_cents: number; note: string | null };
  const expenses = (expRows ?? []) as Expense[];
  const period = sp.period === "year" || sp.period === "all" ? sp.period : "month";
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

  const qs = (v: string, r = repFilter) => `/admin/payments?view=${v}${r ? `&rep=${r}` : ""}${period !== "month" ? `&period=${period}` : ""}`;

  // ----- The whole company, for the chosen period -----
  const nowIso = new Date().toISOString();
  const inPeriod = (d: string | null | undefined) =>
    !!d && (period === "all" || (period === "year" ? d.slice(0, 4) === nowIso.slice(0, 4) : d.slice(0, 7) === nowIso.slice(0, 7)));
  const totals = (match: (d: string | null | undefined) => boolean) => {
    const paid = all.filter((h) => match(h.paid_at));
    const gross = paid.reduce((s, h) => s + h.amount_cents, 0);
    const refunds = all.filter((h) => h.status === "refunded" && match(h.refunded_at ?? h.paid_at)).reduce((s, h) => s + h.amount_cents, 0);
    const comm = paid.filter((h) => earnsCommission(h, h.rep)).reduce((s, h) => s + commissionOf(h, pct, h.rep), 0);
    const exp = expenses.filter((e) => match(e.spent_on)).reduce((s, e) => s + e.amount_cents, 0);
    return { in: gross - refunds, refunds, comm, exp, net: gross - refunds - comm - exp };
  };
  const { in: pIn, refunds: pRefunds, comm: pComm, exp: pExp, net: pNet } = totals(inPeriod);
  const inProgress = agreements.filter((a) => ["considering", "checkout"].includes(stageOf(a)));
  const pipeline = inProgress.reduce((s, a) => s + (a.fee_cents ?? 0), 0);

  // Last 12 months, newest first.
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - i);
    const key = d.toISOString().slice(0, 7);
    return { key, label: d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }), ...totals((x) => !!x && x.slice(0, 7) === key) };
  });
  // Start from the first month with any money in or out.
  const firstMonth = [...all.map((h) => h.paid_at ?? ""), ...expenses.map((e) => e.spent_on)].filter(Boolean).sort()[0]?.slice(0, 7) ?? nowIso.slice(0, 7);
  const shownMonths = months.filter((m) => m.key >= firstMonth);

  // Every rep, even before their first hire.
  const repRows = [...people.values()]
    .filter((p) => !isOwnerEmail(p.email) && ((p as StaffLite & { active?: boolean }).active !== false || reps.has(p.id)))
    .map((p) => {
      const r = reps.get(p.id);
      const owedIds = earning.filter((h) => h.rep?.id === p.id && !h.commission_paid_at).map((h) => h.id);
      return { rep: p, hires: r?.hires ?? 0, owed: r?.owed ?? 0, paid: r?.paid ?? 0, owedIds };
    })
    .sort((a, b) => b.owed - a.owed || b.hires - a.hires);

  return (
    <>
      <div className="page-head" style={{ paddingBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1>Finance</h1>
          <p>
            Money in, what reps are owed, expenses, and what&rsquo;s left. Fees are set in <Link href="/admin/settings">Fee settings</Link>.
          </p>
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

      <div className={styles.tabs}>
        {(
          [
            ["month", "This month"],
            ["year", "This year"],
            ["all", "All time"],
          ] as const
        ).map(([v, label]) => (
          <Link key={v} href={`/admin/payments?period=${v}`} scroll={false} aria-current={v === period ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <strong>{money(pIn)}</strong>
          <span>Fees collected{pRefunds ? `, after ${money(pRefunds)} refunded` : ""}</span>
        </div>
        <div className={styles.stat}>
          <strong>{money(pComm)}</strong>
          <span>Rep commissions earned</span>
        </div>
        <div className={styles.stat}>
          <strong>{money(pExp)}</strong>
          <span>Expenses</span>
        </div>
        <div className={`${styles.stat} ${styles.statActive}`}>
          <strong style={{ color: pNet < 0 ? "var(--rust)" : undefined }}>{money(pNet)}</strong>
          <span>Left for the company</span>
        </div>
        <Link className={styles.stat} href={`${qs("owed", "")}#payments`}>
          <strong>{money(sum(owed))}</strong>
          <span>Owed to reps now ({owed.length} hire{owed.length === 1 ? "" : "s"})</span>
        </Link>
        <Link className={styles.stat} href="/admin/agreements?stage=considering">
          <strong>{money(pipeline)}</strong>
          <span>In progress: fees if {inProgress.length} introduction{inProgress.length === 1 ? "" : "s"} hire</span>
        </Link>
      </div>

      <h2 className={styles.h3} style={{ marginTop: 28 }}>Reps</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Rep</th>
              <th>Terms</th>
              <th>Hires</th>
              <th>Earned</th>
              <th>Paid</th>
              <th>Owed</th>
            </tr>
          </thead>
          <tbody>
            {repRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted small">
                  No reps yet.
                </td>
              </tr>
            ) : (
              repRows.map((r) => (
                <tr key={r.rep.id}>
                  <td>
                    <Link href={`/admin/team/${r.rep.id}`}>{repName(r.rep)}</Link>
                    <div className="small">
                      <Link href={`${qs("all", r.rep.id)}#payments`}>Their hires</Link>
                    </div>
                  </td>
                  <td className="small">{commissionTerms(r.rep, pct)}</td>
                  <td>{r.hires}</td>
                  <td>{r.paid + r.owed ? money(r.paid + r.owed) : "—"}</td>
                  <td>{r.paid ? money(r.paid) : "—"}</td>
                  <td>
                    {r.owed ? (
                      <form action={payRepAll.bind(null, r.rep.id, r.owedIds.join(","))} className={styles.inline}>
                        <strong>{money(r.owed)}</strong>
                        <input className="input" name="note" placeholder="Note, e.g. Zelle" aria-label="Payment note" style={{ width: 130 }} />
                        <ConfirmButton className="btn btn-small" message={`Mark ${money(r.owed)} as paid to ${repName(r.rep)}?`}>
                          Mark all paid
                        </ConfirmButton>
                      </form>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <CommissionRateForm pct={pct} />

      <h2 className={styles.h3} style={{ marginTop: 28 }}>By month</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Fees collected</th>
              <th>Refunds</th>
              <th>Rep commissions</th>
              <th>Expenses</th>
              <th>Left for the company</th>
            </tr>
          </thead>
          <tbody>
            {shownMonths.map((m) => (
              <tr key={m.key}>
                <td>{m.label}</td>
                <td>{m.in ? money(m.in) : "—"}</td>
                <td>{m.refunds ? money(m.refunds) : "—"}</td>
                <td>{m.comm ? money(m.comm) : "—"}</td>
                <td>{m.exp ? money(m.exp) : "—"}</td>
                <td>
                  <strong style={{ color: m.net < 0 ? "var(--rust)" : undefined }}>{money(m.net)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className={styles.h3} style={{ marginTop: 28 }}>Expenses</h2>
      {expErr ? (
        <p className="notice notice-gold">
          Expenses need one quick setup step in Supabase before they can be saved.
          <span className="small" style={{ display: "block", marginTop: 4 }}>
            Details: {[expErr.code, expErr.message].filter(Boolean).join(" ")}
          </span>
        </p>
      ) : (
        <ExpenseForm />
      )}
      {expenses.length > 0 && (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>What</th>
                <th>Category</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.slice(0, 50).map((e) => (
                <tr key={e.id}>
                  <td>{dateShort(e.spent_on)}</td>
                  <td>
                    {e.what}
                    {e.note && <div className="small muted">{e.note}</div>}
                  </td>
                  <td>{e.category}</td>
                  <td>{money(e.amount_cents)}</td>
                  <td>
                    <form action={deleteExpense.bind(null, e.id)}>
                      <ConfirmButton className="linkish small" message={`Delete "${e.what}"?`}>
                        Delete
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className={styles.h3} id="payments" style={{ marginTop: 32, scrollMarginTop: 16 }}>
        Every payment
      </h2>
      <div className={styles.tabs}>
        {VIEWS.map(([v, label]) => (
          <Link key={v} href={qs(v)} scroll={false} aria-current={v === view ? "page" : undefined}>
            {label}
          </Link>
        ))}
        {repFilter && (
          <Link href={qs(view, "")} scroll={false} aria-current="page">
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
