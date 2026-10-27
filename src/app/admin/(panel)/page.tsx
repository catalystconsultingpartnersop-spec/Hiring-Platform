import Link from "next/link";
import { redirect } from "next/navigation";
import { commissionOf, earnsCommission, latest, loadAgreements, repName, stageOf } from "@/lib/adminData";
import { db, dbConfigProblem } from "@/lib/db";
import { lastEmailProblem } from "@/lib/email";
import { dateShort, money, refCode } from "@/lib/format";
import { requireStaff } from "@/lib/session";
import { nowMs } from "@/lib/time";
import { commissionPercent } from "@/lib/settings";
import { EmailCheck } from "./EmailCheck";
import { RepDashboard } from "./RepDashboard";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

const DAY = 864e5;

export default async function Dashboard({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const me = await requireStaff();
  // Old links to the candidate tabs still work.
  if (typeof sp.view === "string") redirect(`/admin/candidates?view=${sp.view}`);
  if (me.role !== "admin") {
    if (!me.id) redirect("/admin/candidates");
    return (
      <>
        {sp.password === "set" && (
          <p className="notice notice-good" role="status" style={{ marginTop: 16 }}>
            Password saved. Next time, sign in with your email and password.
          </p>
        )}
        <RepDashboard staffId={me.id} name={me.name} self nowIso={new Date(nowMs()).toISOString()} />
      </>
    );
  }

  const problem = dbConfigProblem();
  if (problem) {
    return (
      <div className="notice notice-bad" role="alert" style={{ marginTop: 24 }}>
        <strong>The site can&rsquo;t reach the database.</strong> {problem} Fix it in Vercel under Settings, then
        Environment Variables, and redeploy.
      </div>
    );
  }

  const NOW = nowMs();
  const now = new Date(NOW);
  const [{ rows: agreements, error, people }, pct, { data: cands, error: candErr }, { data: calls }, emailProblem] =
    await Promise.all([
      loadAgreements(),
      commissionPercent(),
      db().from("candidates").select("id, status"),
      db()
        .from("onboarding_calls")
        .select("id, starts_at")
        .eq("status", "booked")
        .gte("starts_at", now.toISOString())
        .lte("starts_at", new Date(now.getTime() + 7 * DAY).toISOString()),
      lastEmailProblem(),
    ]);
  const dbError = error ?? candErr;
  const count = (s: string) => (cands ?? []).filter((c) => c.status === s).length;

  const active = agreements.filter((a) => a.confirmed_at);
  const considering = active.filter((a) => ["considering", "checkout"].includes(stageOf(a)));
  const hires = agreements
    .flatMap((a) => a.hires.filter((h) => h.paid_at).map((h) => ({ h, a, rep: people.get(h.rep_id ?? a.candidates.added_by ?? "") })))
    .sort((x, y) => (y.h.paid_at ?? "").localeCompare(x.h.paid_at ?? ""));
  const live = hires.filter(({ h }) => h.status === "paid" || h.status === "hired");
  const net = live.reduce((s, { h }) => s + h.amount_cents, 0);
  const owed = live.filter(({ h, rep }) => earnsCommission(h, rep) && !h.commission_paid_at);
  const owedTotal = owed.reduce((s, { h }) => s + commissionOf(h, pct), 0);
  const thisMonth = live.filter(({ h }) => (h.paid_at ?? "").slice(0, 7) === now.toISOString().slice(0, 7));
  const needFee = active.filter((a) => a.fee_cents == null && stageOf(a) === "considering");
  const toConfirm = agreements.filter((a) => stageOf(a) === "paid" && NOW - new Date(latest(a.hires)!.paid_at!).getTime() > 14 * DAY);

  const rk = process.env.RESEND_API_KEY?.trim() ?? "";
  const emailSettings = [
    `RESEND_API_KEY ${rk ? `is set (starts with ${rk.slice(0, 3)}, ${rk.length} characters${rk !== process.env.RESEND_API_KEY ? ", has extra spaces" : ""})` : "is missing"}`,
    `EMAIL_FROM ${process.env.EMAIL_FROM ? `is "${process.env.EMAIL_FROM}"` : "is missing"}`,
    `ADMIN_EMAIL ${process.env.ADMIN_EMAIL ? `is ${process.env.ADMIN_EMAIL}` : "is missing"}`,
  ].join("; ");

  const todo: { text: React.ReactNode; href: string; cta: string }[] = [];
  if (count("applied")) todo.push({ text: <>{count("applied")} new application{count("applied") > 1 ? "s" : ""} to review</>, href: "/admin/candidates?view=applied", cta: "Review" });
  if (owed.length) todo.push({ text: <>{money(owedTotal)} in rep commission to pay out ({owed.length} hire{owed.length > 1 ? "s" : ""})</>, href: "/admin/payments?view=owed", cta: "Pay out" });
  if (needFee.length) todo.push({ text: <>{needFee.length} agreement{needFee.length > 1 ? "s" : ""} need a fee set</>, href: "/admin/agreements?stage=considering", cta: "Set fee" });
  if (toConfirm.length) todo.push({ text: <>{toConfirm.length} paid hire{toConfirm.length > 1 ? "s" : ""} not yet marked as started</>, href: "/admin/agreements?stage=paid", cta: "Check" });

  return (
    <>
      <div className="page-head" style={{ paddingBottom: 0 }}>
        <h1>Dashboard</h1>
      </div>
      {dbError && (
        <div className="notice notice-bad" role="alert" style={{ marginTop: 12 }}>
          <strong>The database connection isn&rsquo;t working.</strong> Error:{" "}
          <code>{[dbError.code, dbError.message, dbError.hint].filter(Boolean).join(" | ")}</code>
        </div>
      )}
      {sp.password === "set" && (
        <p className="notice notice-good" role="status" style={{ marginTop: 12 }}>
          Password saved. Next time, sign in with your email and password.
        </p>
      )}
      <EmailCheck problem={emailProblem} settings={emailSettings} />

      <div className={styles.stats}>
        <Link className={styles.stat} href="/admin/payments">
          <strong>{money(net)}</strong>
          <span>Fees collected · {money(thisMonth.reduce((s, { h }) => s + h.amount_cents, 0))} this month</span>
        </Link>
        <Link className={styles.stat} href="/admin/agreements">
          <strong>{active.length}</strong>
          <span>Agreements signed · {considering.length} considering</span>
        </Link>
        <Link className={`${styles.stat} ${owed.length ? styles.statActive : ""}`} href="/admin/payments?view=owed">
          <strong>{money(owedTotal)}</strong>
          <span>Commission owed to reps</span>
        </Link>
        <Link className={`${styles.stat} ${count("applied") ? styles.statActive : ""}`} href="/admin/candidates?view=applied">
          <strong>{count("applied")}</strong>
          <span>New applications</span>
        </Link>
        <Link className={styles.stat} href="/admin/candidates?view=listed">
          <strong>{count("listed")}</strong>
          <span>Listed now · {count("hired")} hired</span>
        </Link>
        <Link className={styles.stat} href="/admin/calls">
          <strong>{calls?.length ?? 0}</strong>
          <span>Onboarding calls next 7 days</span>
        </Link>
      </div>

      <div className={styles.split}>
        <div className="panel">
          <h2 className={styles.h3}>Recent hires</h2>
          {hires.length === 0 ? (
            <p className="small muted">No hires yet. They&rsquo;ll show here with the rep who brought them in.</p>
          ) : (
            <table className="table" style={{ fontSize: 14 }}>
              <thead>
                <tr>
                  <th>Hired</th>
                  <th>By</th>
                  <th>Fee</th>
                  <th>Rep</th>
                </tr>
              </thead>
              <tbody>
                {hires.slice(0, 6).map(({ h, a, rep }) => (
                  <tr key={h.id}>
                    <td>
                      <Link href={`/admin/candidates/${a.candidate_id}`}>{a.candidates.full_name}</Link>
                      <div className="small muted">
                        {refCode(a.candidate_id)}, {dateShort(h.paid_at)}
                      </div>
                    </td>
                    <td>{a.owners.company}</td>
                    <td>
                      {money(h.amount_cents)}
                      {h.status === "refunded" && <div className="small" style={{ color: "var(--rust)" }}>Refunded</div>}
                    </td>
                    <td>
                      {repName(rep) ?? <span className="muted">Online</span>}
                      {earnsCommission(h, rep) && (
                        <div className="small">
                          {h.commission_paid_at ? (
                            <span className="muted">Paid out</span>
                          ) : (
                            <span style={{ color: "#6b4f00" }}>{money(commissionOf(h, pct))} owed</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="small" style={{ margin: "12px 0 0" }}>
            <Link href="/admin/payments">All payments and commissions</Link>
          </p>
        </div>
        <div className="panel">
          <h2 className={styles.h3}>Needs your attention</h2>
          {todo.length === 0 ? (
            <p className="small muted">All caught up.</p>
          ) : (
            <ul className={styles.attention}>
              {todo.map((t, i) => (
                <li key={i}>
                  <span>{t.text}</span>
                  <Link href={t.href} className="small">
                    {t.cta}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
