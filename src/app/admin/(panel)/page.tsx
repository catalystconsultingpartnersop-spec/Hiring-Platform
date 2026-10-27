import Link from "next/link";
import { ConfirmButton } from "@/components/ConfirmButton";
import { db, dbConfigProblem, Hire } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { EmailCheck } from "./EmailCheck";
import { lastEmailProblem } from "@/lib/email";
import { dateShort, money, refCode } from "@/lib/format";
import { markHired, refundHire, setUnlockFee } from "../actions";
import styles from "./admin.module.css";

const VIEWS = [
  ["applied", "New applications"],
  ["draft", "Drafts"],
  ["listed", "Listed"],
  ["paused", "Paused"],
  ["hired", "Hired"],
  ["archived", "Archived"],
] as const;

type CandRow = {
  id: string;
  status: string;
  full_name: string;
  email: string;
  headline: string | null;
  role_category: string | null;
  created_at: string;
  listed_at: string | null;
  staff: { full_name: string | null; email: string } | null;
};

type UnlockRow = {
  id: string;
  candidate_id: string;
  signed_at: string;
  signed_name: string;
  fee_cents: number | null;
  candidates: { full_name: string };
  owners: { email: string; full_name: string | null; company: string | null; phone: string | null };
  hires: Hire[];
};

export default async function AdminHome({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const me = await requireStaff();
  const admin = me.role === "admin";
  const problem = dbConfigProblem();
  if (problem) {
    return (
      <div className="notice notice-bad" role="alert" style={{ marginTop: 24 }}>
        <strong>The site can&rsquo;t reach the database.</strong> {problem} Fix it in Vercel under Settings, then
        Environment Variables, and redeploy.
      </div>
    );
  }
  const view = typeof sp.view === "string" && VIEWS.some(([v]) => v === sp.view) ? sp.view : "applied";

  const [{ data: all, error: candErr }, { data: unlockData, error: unlockErr }] = await Promise.all([
    db()
      .from("candidates")
      .select("id, status, full_name, email, headline, role_category, created_at, listed_at, staff(full_name, email)")
      .order("created_at", { ascending: false }),
    db()
      .from("unlocks")
      .select("id, candidate_id, signed_at, signed_name, fee_cents, candidates(full_name), owners(email, full_name, company, phone), hires(*)")
      .order("signed_at", { ascending: false })
      .limit(100),
  ]);
  const cands = (all ?? []) as unknown as CandRow[];
  const unlocks = (unlockData ?? []) as unknown as UnlockRow[];
  const count = (s: string) => cands.filter((c) => c.status === s).length;
  const shown = cands.filter((c) => c.status === view);
  const paidTotal = unlocks
    .flatMap((u) => u.hires)
    .filter((h) => h.status === "paid" || h.status === "hired")
    .reduce((s, h) => s + h.amount_cents, 0);

  const dbError = candErr ?? unlockErr;

  // Most recent email failure in the last day, so problems are visible here.
  const emailProblem = admin ? await lastEmailProblem() : null;
  const rk = process.env.RESEND_API_KEY?.trim() ?? "";
  const emailSettings = [
    `RESEND_API_KEY ${rk ? `is set (starts with ${rk.slice(0, 3)}, ${rk.length} characters${rk !== process.env.RESEND_API_KEY ? ", has extra spaces" : ""})` : "is missing"}`,
    `EMAIL_FROM ${process.env.EMAIL_FROM ? `is "${process.env.EMAIL_FROM}"` : "is missing"}`,
    `ADMIN_EMAIL ${process.env.ADMIN_EMAIL ? `is ${process.env.ADMIN_EMAIL}` : "is missing"}`,
  ].join("; ");
  if (dbError) console.error("admin dashboard query failed", dbError);

  return (
    <>
      {dbError && (
        <div className="notice notice-bad" role="alert" style={{ marginTop: 20 }}>
          <strong>The database connection isn&rsquo;t working.</strong> Error:{" "}
          <code>{[dbError.code, dbError.message, dbError.hint].filter(Boolean).join(" | ")}</code>
        </div>
      )}
      <div className={styles.stats}>
        <Link className={`${styles.stat} ${count("applied") ? styles.statActive : ""}`} href="/admin?view=applied">
          <strong>{count("applied")}</strong>
          <span>New applications</span>
        </Link>
        <Link className={styles.stat} href="/admin?view=listed">
          <strong>{count("listed")}</strong>
          <span>Listed now</span>
        </Link>
        {admin && (
          <div className={styles.stat}>
            <strong>{unlocks.length}</strong>
            <span>Agreements signed</span>
          </div>
        )}
        {admin && (
          <div className={styles.stat}>
            <strong>{money(paidTotal)}</strong>
            <span>Fees collected</span>
          </div>
        )}
      </div>

      {admin && <EmailCheck problem={emailProblem} settings={emailSettings} />}

      <h2 className={styles.h2}>Candidates</h2>
      <div className={styles.tabs}>
        {VIEWS.map(([v, label]) => (
          <Link key={v} href={`/admin?view=${v}`} aria-current={v === view ? "page" : undefined}>
            {label} ({count(v)})
          </Link>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="panel panel-wash">
          No one here. <Link href="/admin/candidates/new">Add a candidate</Link>
        </p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Profile</th>
                <th>Added by</th>
                <th>{view === "listed" ? "Listed" : "Added"}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/candidates/${c.id}`}>{c.full_name}</Link>
                    <div className="small muted">{c.email}</div>
                  </td>
                  <td>
                    {c.headline ?? <span className="muted">No profile yet</span>}
                    <div className="small muted">
                      {refCode(c.id)}
                      {c.role_category ? `, ${c.role_category}` : ""}
                    </div>
                  </td>
                  <td>{c.staff ? c.staff.full_name || c.staff.email : <span className="muted">Applied online</span>}</td>
                  <td>{dateShort(view === "listed" ? c.listed_at : c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {admin && <h2 className={styles.h2}>Signed agreements</h2>}
      {!admin ? null : unlocks.length === 0 ? (
        <p className="panel panel-wash">No owner has signed yet. Signed agreements and payments show up here.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Candidate</th>
                <th>Signed</th>
                <th>Fee</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {unlocks.map((u) => {
                const hire = [...u.hires].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
                return (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.owners.company}</strong>
                      <div className="small muted">
                        {u.owners.full_name}, <a href={`mailto:${u.owners.email}`}>{u.owners.email}</a>
                        {u.owners.phone ? `, ${u.owners.phone}` : ""}
                      </div>
                    </td>
                    <td>
                      <Link href={`/admin/candidates/${u.candidate_id}`}>{u.candidates.full_name}</Link>
                      <div className="small muted">{refCode(u.candidate_id)}</div>
                    </td>
                    <td>{dateShort(u.signed_at)}</td>
                    <td>
                      {u.fee_cents != null ? (
                        money(u.fee_cents)
                      ) : (
                        <form action={setUnlockFee.bind(null, u.id)} className={styles.inline}>
                          <input className="input" name="fee" placeholder="$ amount" aria-label="Fee in dollars" />
                          <button className="btn btn-small" type="submit">
                            Set fee
                          </button>
                        </form>
                      )}
                    </td>
                    <td>
                      {!hire ? (
                        <span className="tag">Considering</span>
                      ) : hire.status === "pending" ? (
                        <span className="tag">Checkout opened</span>
                      ) : hire.status === "paid" ? (
                        <div className={styles.inline}>
                          <span className="tag tag-good">Paid {dateShort(hire.paid_at)}</span>
                          <form action={markHired.bind(null, hire.id)}>
                            <button className="btn btn-small" type="submit">
                              Mark hired
                            </button>
                          </form>
                          <form action={refundHire.bind(null, hire.id)}>
                            <ConfirmButton
                              className="btn btn-small btn-danger"
                              message={`Refund ${money(hire.amount_cents)} to ${u.owners.company}? This can't be undone.`}
                            >
                              Refund
                            </ConfirmButton>
                          </form>
                        </div>
                      ) : hire.status === "hired" ? (
                        <span className="tag tag-good">Hired {dateShort(hire.hired_at)}</span>
                      ) : (
                        <span className="tag">Refunded {dateShort(hire.refunded_at)}</span>
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
