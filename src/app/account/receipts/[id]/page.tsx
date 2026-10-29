import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { Letterhead } from "@/components/Logo";
import { legalEntity } from "@/lib/agreement";
import { db, Hire } from "@/lib/db";
import { brandName, contactPhone, money, refCode } from "@/lib/format";
import { dateLong, receiptNumber } from "@/lib/receipt";
import { currentOwner, isAdmin } from "@/lib/session";
import styles from "./receipt.module.css";

export const dynamic = "force-dynamic";

type Row = Hire & {
  unlocks: {
    id: string;
    candidate_id: string;
    signed_at: string;
    card_label: string | null;
    owner_id: string;
    owners: { email: string; full_name: string | null; company: string | null };
    candidates: { full_name: string };
  };
};

export default async function ReceiptPage({ params }: PageProps<"/account/receipts/[id]">) {
  const { id } = await params;
  const [owner, admin] = await Promise.all([currentOwner(), isAdmin()]);
  if (!owner && !admin) redirect(`/login?next=${encodeURIComponent(`/account/receipts/${id}`)}`);

  const { data } = await db()
    .from("hires")
    .select("*, unlocks(id, candidate_id, signed_at, card_label, owner_id, owners(email, full_name, company), candidates(full_name))")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const h = data as unknown as Row;
  if (!admin && h.unlocks.owner_id !== owner?.id) notFound();
  if (!h.paid_at) notFound();

  const u = h.unlocks;
  const paidWith = h.stripe_session_id ? "Card, paid on Stripe" : (u.card_label ?? "Card on file");

  return (
    <div className="wrap narrow" style={{ paddingTop: 28, paddingBottom: 48 }}>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <Link href={admin && !owner ? "/admin" : "/account"} className="small muted">
          {admin && !owner ? "Back to the dashboard" : "Your candidates"}
        </Link>
        <PrintButton />
      </div>

      <Letterhead right={<>Receipt {receiptNumber(h.id)}<br />{contactPhone()}</>} />
      <div className={styles.receipt}>
        <div className={styles.head}>
          <div>
            <h1>Receipt</h1>
          </div>
          <div className={styles.number}>
            <span>Receipt number</span>
            <strong>{receiptNumber(h.id)}</strong>
          </div>
        </div>

        <div className={styles.amount}>
          <span>Amount paid</span>
          <strong>{money(h.amount_cents)}</strong>
          {h.status === "refunded" ? (
            <em className={styles.refunded}>Refunded {h.refunded_at ? dateLong(h.refunded_at) : ""}</em>
          ) : (
            <em>Paid {dateLong(h.paid_at)}</em>
          )}
        </div>

        <div className={styles.parties}>
          <div>
            <span>Billed to</span>
            <p>
              <strong>{u.owners.company}</strong>
              <br />
              {u.owners.full_name}
              <br />
              {u.owners.email}
            </p>
          </div>
          <div>
            <span>From</span>
            <p>
              <strong>{legalEntity()}</strong>
              <br />
              doing business as {brandName()}
              <br />
              {contactPhone()}
            </p>
          </div>
        </div>

        <table className={styles.lines}>
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                Placement fee: {u.candidates.full_name}
                <div className="small muted">
                  Candidate {refCode(u.candidate_id)}, agreement signed {dateLong(u.signed_at)}
                </div>
              </td>
              <td>{money(h.amount_cents)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td>Total paid</td>
              <td>{money(h.amount_cents)}</td>
            </tr>
          </tfoot>
        </table>

        <dl className={styles.meta}>
          <div>
            <dt>Paid with</dt>
            <dd>{paidWith}</dd>
          </div>
          <div>
            <dt>Payment reference</dt>
            <dd>{h.stripe_payment_intent ?? "—"}</dd>
          </div>
        </dl>
        <p className={`small muted ${styles.foot}`}>
          One flat fee. No percentage of salary. Terms are in your{" "}
          <Link href={`/account/agreements/${u.id}`}>signed agreement</Link>.
        </p>
      </div>
    </div>
  );
}
