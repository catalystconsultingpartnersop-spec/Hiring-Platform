import Link from "next/link";
import { notFound } from "next/navigation";
import { latest, loadAgreements, STAGE_LABEL, stageOf } from "@/lib/adminData";
import { db, Owner } from "@/lib/db";
import { dateShort, money, refCode } from "@/lib/format";
import { receiptNumber } from "@/lib/receipt";
import { requireAdmin } from "@/lib/session";
import { RefundButton } from "../../RefundButton";
import styles from "../../admin.module.css";

export const dynamic = "force-dynamic";

export default async function ClientPage({ params, searchParams }: PageProps<"/admin/clients/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  await requireAdmin();
  const { data } = await db().from("owners").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const o = data as Owner & { created_at: string; last_login_at: string | null };
  const { rows } = await loadAgreements();
  const mine = rows.filter((a) => a.owners.email === o.email);
  const payments = mine
    .flatMap((a) => a.hires.filter((h) => h.paid_at).map((h) => ({ h, a })))
    .sort((x, y) => (y.h.paid_at ?? "").localeCompare(x.h.paid_at ?? ""));
  const paid = payments.filter(({ h }) => h.status !== "refunded").reduce((s, { h }) => s + h.amount_cents, 0);
  const refunded = payments.filter(({ h }) => h.status === "refunded").reduce((s, { h }) => s + h.amount_cents, 0);
  const back = `/admin/clients/${id}`;

  return (
    <>
      <p style={{ marginTop: 16 }}>
        <Link href="/admin/clients" className="small muted">
          Clients
        </Link>
      </p>
      <div className="page-head" style={{ paddingTop: 6, paddingBottom: 8 }}>
        <h1>{o.company || o.email}</h1>
        <p>
          {o.full_name} · <a href={`mailto:${o.email}`}>{o.email}</a>
          {o.phone ? ` · ${o.phone}` : ""}
        </p>
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

      <div className={styles.stats}>
        <div className={styles.stat}>
          <strong>{mine.filter((a) => a.confirmed_at).length}</strong>
          <span>Agreements signed</span>
        </div>
        <div className={styles.stat}>
          <strong>{money(paid)}</strong>
          <span>Paid</span>
        </div>
        <div className={styles.stat}>
          <strong>{money(refunded)}</strong>
          <span>Refunded</span>
        </div>
        <div className={styles.stat}>
          <strong style={{ fontSize: 20 }}>{o.card_label ?? "None"}</strong>
          <span>Card on file</span>
        </div>
      </div>
      <p className="small muted">
        Joined {dateShort(o.created_at)} · Last signed in {dateShort(o.last_login_at)}
      </p>

      <h2 className={styles.h2}>Payments</h2>
      {payments.length === 0 ? (
        <p className="panel panel-wash">No payments yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Paid</th>
                <th>Candidate</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(({ h, a }) => (
                <tr key={h.id}>
                  <td>
                    {dateShort(h.paid_at)}
                    <div className="small">
                      <Link href={`/account/receipts/${h.id}`}>{receiptNumber(h.id)}</Link>
                    </div>
                  </td>
                  <td>
                    <Link href={`/admin/candidates/${a.candidate_id}`}>{a.candidates.full_name}</Link>
                    <div className="small muted">{refCode(a.candidate_id)}</div>
                  </td>
                  <td>{money(h.amount_cents)}</td>
                  <td>
                    {h.status === "refunded" ? (
                      <span className="tag tag-bad">Refunded {dateShort(h.refunded_at)}</span>
                    ) : (
                      <div style={{ display: "grid", gap: 6, justifyItems: "start" }}>
                        <span className="tag tag-good">{h.status === "hired" ? "Hired" : "Paid"}</span>
                        <RefundButton hireId={h.id} amount={money(h.amount_cents)} company={o.company ?? "this client"} back={back} />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className={styles.h2}>Agreements</h2>
      {mine.length === 0 ? (
        <p className="panel panel-wash">This client hasn&rsquo;t signed for anyone yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Signed</th>
                <th>Fee</th>
                <th>Where it stands</th>
              </tr>
            </thead>
            <tbody>
              {mine.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/admin/candidates/${a.candidate_id}`}>{a.candidates.full_name}</Link>
                    <div className="small muted">{refCode(a.candidate_id)}</div>
                  </td>
                  <td>
                    <Link href={`/account/agreements/${a.id}`}>{dateShort(a.signed_at)}</Link>
                  </td>
                  <td>{money(a.fee_cents)}</td>
                  <td>
                    <span className="tag">{STAGE_LABEL[stageOf(a)]}</span>
                    {latest(a.hires)?.paid_at && <span className="small muted"> {dateShort(latest(a.hires)!.paid_at)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
