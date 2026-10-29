import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { db, Hire } from "@/lib/db";
import { dateShort, money, refCode } from "@/lib/format";
import { requireOwner } from "@/lib/session";
import styles from "./account.module.css";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  candidate_id: string;
  signed_at: string;
  fee_cents: number | null;
  passed_at?: string | null;
  candidates: { full_name: string; headline: string | null; status: string };
  hires: Hire[];
};

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const sp = await searchParams;
  const owner = await requireOwner("/account");
  const { data } = await db()
    .from("unlocks")
    .select("*, candidates(full_name, headline, status), hires(*)")
    .eq("owner_id", owner.id)
    .not("confirmed_at", "is", null)
    .order("signed_at", { ascending: false });
  const all = (data ?? []) as unknown as Row[];
  // Candidates they passed on go to the bottom.
  const rows = [...all.filter((r) => !r.passed_at), ...all.filter((r) => r.passed_at)];

  return (
    <div className="wrap">
      <div className="page-head">
        <h1>Your candidates</h1>
        <p>
          {owner.full_name}, {owner.company}. Everyone you&rsquo;ve signed for is here.
          {owner.card_label && owner.card_label !== "card on file" ? ` Card on file: ${owner.card_label}.` : owner.card_pm ? " Your card is on file." : ""}
        </p>
      </div>
      {sp.card === "failed" && (
        <p className="notice notice-bad" role="alert" style={{ marginBottom: 20 }}>
          We couldn&rsquo;t confirm your card, so nothing was unlocked and nothing was charged. Open the candidate and
          try again.
        </p>
      )}

      {typeof sp.passed === "string" && (
        <p className="notice notice-good" role="status" style={{ marginBottom: 20 }}>
          Done. {sp.passed} is off your list, and nothing was charged. Thanks for telling us. If you change your mind,
          open {sp.passed}&rsquo;s page and put them back.
        </p>
      )}

      {rows.length === 0 ? (
        <div className="panel panel-wash">
          <p>You haven&rsquo;t unlocked anyone yet.</p>
          <Link className="btn btn-gold" href="/candidates" style={{ marginTop: 16 }}>
            Browse candidates
          </Link>
        </div>
      ) : (
        <ul className={styles.list}>
          {rows.map((r) => {
            const hire = [...r.hires].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
            const st =
              hire?.status === "paid"
                ? { label: "Paid", cls: "tag tag-good" }
                : hire?.status === "hired"
                  ? { label: "Hired", cls: "tag tag-good" }
                  : hire?.status === "refunded"
                    ? { label: "Refunded", cls: "tag" }
                    : r.passed_at
                      ? { label: "Not a fit", cls: "tag" }
                      : r.candidates.status === "hired"
                        ? { label: "No longer available", cls: "tag" }
                        : { label: "Considering", cls: "tag tag-gold" };
            return (
              <li key={r.id} className={`${styles.item} ${r.passed_at ? styles.dim : ""}`}>
                <div className={styles.itemTop}>
                  <Link href={`/candidates/${r.candidate_id}`} className={styles.name}>
                    {r.candidates.full_name}
                  </Link>
                  <span className={st.cls}>{st.label}</span>
                </div>
                <p className={styles.headline}>{r.candidates.headline}</p>
                <div className={styles.meta}>
                  <span>
                    <b>{money(hire?.amount_cents ?? r.fee_cents)}</b> fee
                  </span>
                  <span>Signed {dateShort(r.signed_at)}</span>
                  <span>{refCode(r.candidate_id)}</span>
                </div>
                <div className={styles.links}>
                  <Link href={`/account/agreements/${r.id}`}>Agreement</Link>
                  {hire?.paid_at && <Link href={`/account/receipts/${hire.id}`}>Receipt</Link>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className={styles.actions}>
        <Link className="btn btn-small" href="/hiring-help">
          Hiring help and templates
        </Link>
        <Link className="btn btn-ghost btn-small" href="/account/setup?next=/account">
          Edit your details
        </Link>
        <form action={signOut}>
          <button className="btn btn-ghost btn-small" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
