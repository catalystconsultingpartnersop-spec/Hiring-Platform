import Link from "next/link";
import { ConfirmButton } from "@/components/ConfirmButton";
import { AgreementRow, latest, loadAgreements, repName, STAGE_LABEL, stageOf } from "@/lib/adminData";
import { dateShort, money, refCode } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { nowMs } from "@/lib/time";
import { chargeAgreement, markHired, refundHire, setUnlockFee } from "../../actions";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

const PERIODS = [
  ["30", "Last 30 days"],
  ["90", "Last 90 days"],
  ["365", "Last 12 months"],
  ["all", "All time"],
] as const;
const STAGES = ["all", "considering", "paid", "hired", "refunded", "no_card"] as const;

const DAY = 864e5;

export default async function AgreementsPage({ searchParams }: PageProps<"/admin/agreements">) {
  const sp = await searchParams;
  await requireAdmin();
  const NOW = nowMs();
  const { rows: everything, error, people } = await loadAgreements();
  const period = typeof sp.period === "string" && PERIODS.some(([p]) => p === sp.period) ? sp.period : "all";
  const stage = typeof sp.stage === "string" && (STAGES as readonly string[]).includes(sp.stage) ? sp.stage : "all";
  const since = period === "all" ? 0 : NOW - Number(period) * DAY;
  const rows = everything.filter((a) => new Date(a.signed_at).getTime() >= since);

  // Funnel
  const active = rows.filter((a) => a.confirmed_at);
  const converted = active.filter((a) => ["paid", "hired"].includes(stageOf(a)));
  const considering = active.filter((a) => stageOf(a) === "considering" || stageOf(a) === "checkout");
  const pipeline = considering.reduce((s, a) => s + (a.fee_cents ?? 0), 0);
  const rate = active.length ? Math.round((converted.length / active.length) * 100) : 0;
  const days = converted
    .map((a) => {
      const h = latest(a.hires)!;
      return (new Date(h.paid_at!).getTime() - new Date(a.signed_at).getTime()) / DAY;
    })
    .sort((x, y) => x - y);
  const medianDays = days.length ? Math.round(days[Math.floor(days.length / 2)]) : null;
  const expiringSoon = considering.filter((a) => {
    const left = new Date(a.signed_at).getTime() + 365 * DAY - NOW;
    return left > 0 && left < 30 * DAY;
  });

  // Last 6 months: signed vs hired
  const months: { key: string; label: string; signed: number; hired: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(NOW);
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleDateString("en-US", { month: "short" }), signed: 0, hired: 0 });
  }
  for (const a of everything.filter((x) => x.confirmed_at)) {
    const m = months.find((x) => x.key === a.signed_at.slice(0, 7));
    if (m) m.signed++;
    const h = latest(a.hires);
    if (h?.paid_at && ["paid", "hired"].includes(h.status)) {
      const mh = months.find((x) => x.key === h.paid_at!.slice(0, 7));
      if (mh) mh.hired++;
    }
  }
  const maxM = Math.max(1, ...months.map((m) => m.signed));

  // Most-unlocked candidates and most active companies
  const tally = (key: (a: AgreementRow) => string) => {
    const m = new Map<string, { n: number; hired: number; sample: AgreementRow }>();
    for (const a of active) {
      const k = key(a);
      const v = m.get(k) ?? { n: 0, hired: 0, sample: a };
      v.n++;
      if (["paid", "hired"].includes(stageOf(a))) v.hired++;
      m.set(k, v);
    }
    return [...m.values()].sort((x, y) => y.n - x.n).slice(0, 5);
  };
  const topCandidates = tally((a) => a.candidate_id);
  const topCompanies = tally((a) => (a.owners.company ?? a.owners.email).toLowerCase());

  const shown = stage === "all" ? rows : rows.filter((a) => (stage === "considering" ? ["considering", "checkout"] : [stage]).includes(stageOf(a)));
  const qs = (p: string, s: string) => `/admin/agreements?period=${p}&stage=${s}`;
  const countStage = (s: string) => (s === "all" ? rows.length : rows.filter((a) => (s === "considering" ? ["considering", "checkout"] : [s]).includes(stageOf(a))).length);

  return (
    <>
      <div className="page-head" style={{ paddingBottom: 4 }}>
        <h1>Agreements</h1>
        <p>Every owner who signed to see a candidate, and where each one stands.</p>
      </div>
      {error && (
        <p className="notice notice-bad" role="alert">
          Couldn&rsquo;t load agreements: {error.message}
        </p>
      )}
      {sp.charged === "1" && (
        <p className="notice notice-good" role="status">
          Charged. The owner was emailed a receipt.
        </p>
      )}
      {typeof sp.charge_error === "string" && (
        <p className="notice notice-bad" role="alert">
          The card wasn&rsquo;t charged: {sp.charge_error}
        </p>
      )}

      <div className={styles.tabs}>
        {PERIODS.map(([p, label]) => (
          <Link key={p} href={qs(p, stage)} aria-current={p === period ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </div>

      <div className={styles.stats} style={{ marginTop: 14 }}>
        <div className={styles.stat}>
          <strong>{active.length}</strong>
          <span>Signed, card on file</span>
        </div>
        <div className={styles.stat}>
          <strong>{converted.length}</strong>
          <span>Turned into a hire</span>
        </div>
        <div className={styles.stat}>
          <strong>{rate}%</strong>
          <span>Hire rate</span>
        </div>
        <div className={styles.stat}>
          <strong>{medianDays == null ? "—" : `${medianDays} d`}</strong>
          <span>Typical days, signing to paying</span>
        </div>
        <Link className={styles.stat} href={qs(period, "considering")}>
          <strong>{money(pipeline)}</strong>
          <span>Open pipeline ({considering.length} considering)</span>
        </Link>
      </div>

      <div className={styles.split}>
        <div className="panel">
          <h2 className={styles.h3}>Last 6 months</h2>
          <div className={styles.bars}>
            {months.map((m) => (
              <div key={m.key} className={styles.barRow}>
                <span>{m.label}</span>
                <div className={styles.barTrack} title={`${m.signed} signed, ${m.hired} hired`}>
                  <div className={styles.barSigned} style={{ width: `${(m.signed / maxM) * 100}%` }} />
                  <div className={styles.barHired} style={{ width: `${(m.hired / maxM) * 100}%` }} />
                </div>
                <span className="muted">
                  {m.signed} / {m.hired}
                </span>
              </div>
            ))}
          </div>
          <div className={styles.legend}>
            <span>
              <i style={{ background: "#c9d2e3" }} />
              Signed
            </span>
            <span>
              <i style={{ background: "var(--moss)" }} />
              Hired (by month paid)
            </span>
          </div>
        </div>
        <div className="panel">
          <h2 className={styles.h3}>Worth a follow-up</h2>
          <ul className={styles.attention}>
            {considering.slice(0, 4).map((a) => (
              <li key={a.id}>
                <span>
                  <strong>{a.owners.company}</strong> has been considering{" "}
                  <Link href={`/admin/candidates/${a.candidate_id}`}>{a.candidates.full_name}</Link> for{" "}
                  {Math.max(0, Math.round((NOW - new Date(a.signed_at).getTime()) / DAY))} days
                </span>
                <a href={`mailto:${a.owners.email}`} className="small">
                  Email
                </a>
              </li>
            ))}
            {considering.length === 0 && <li className="small muted">No one is mid-decision right now.</li>}
          </ul>
          {expiringSoon.length > 0 && (
            <p className="small" style={{ marginTop: 10 }}>
              {expiringSoon.length} agreement{expiringSoon.length > 1 ? "s" : ""} reach the 12-month mark within 30 days.
            </p>
          )}
        </div>
      </div>

      <div className={styles.split} style={{ marginTop: 16 }}>
        <div className="panel">
          <h2 className={styles.h3}>Most-unlocked candidates</h2>
          {topCandidates.length === 0 ? (
            <p className="small muted">Nothing yet.</p>
          ) : (
            <table className="table" style={{ fontSize: 14 }}>
              <tbody>
                {topCandidates.map((t) => (
                  <tr key={t.sample.candidate_id}>
                    <td>
                      <Link href={`/admin/candidates/${t.sample.candidate_id}`}>{t.sample.candidates.full_name}</Link>
                      <div className="small muted">{t.sample.candidates.role_category}</div>
                    </td>
                    <td>{t.n} signed</td>
                    <td>{t.hired ? <span className="tag tag-good">Hired</span> : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="panel">
          <h2 className={styles.h3}>Most active companies</h2>
          {topCompanies.length === 0 ? (
            <p className="small muted">Nothing yet.</p>
          ) : (
            <table className="table" style={{ fontSize: 14 }}>
              <tbody>
                {topCompanies.map((t) => (
                  <tr key={t.sample.id}>
                    <td>
                      {t.sample.owners.company}
                      <div className="small muted">{t.sample.owners.email}</div>
                    </td>
                    <td>{t.n} signed</td>
                    <td>{t.hired} hired</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <h2 className={styles.h2}>All agreements</h2>
      <div className={styles.tabs}>
        {STAGES.map((s) => (
          <Link key={s} href={qs(period, s)} aria-current={s === stage ? "page" : undefined}>
            {s === "all" ? "All" : s === "considering" ? "Considering" : STAGE_LABEL[s]} ({countStage(s)})
          </Link>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="panel panel-wash">No agreements here.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Candidate</th>
                <th>Signed</th>
                <th>Fee</th>
                <th>Where it stands</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((u) => {
                const hire = latest(u.hires);
                const st = stageOf(u);
                const rep = people.get(u.candidates.added_by ?? "");
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
                      <div className="small muted">
                        {refCode(u.candidate_id)}
                        {rep ? `, rep: ${repName(rep)}` : ""}
                      </div>
                    </td>
                    <td>
                      <Link href={`/account/agreements/${u.id}`}>{dateShort(u.signed_at)}</Link>
                      <div className="small muted">{u.confirmed_at ? (u.card_label ?? "Card on file") : "No card"}</div>
                    </td>
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
                      <div className={styles.inline}>
                        <span className={`tag ${st === "paid" || st === "hired" ? "tag-good" : st === "refunded" || st === "no_card" ? "" : "tag-gold"}`}>
                          {STAGE_LABEL[st]}
                          {hire?.paid_at && st !== "refunded" ? ` ${dateShort(hire.paid_at)}` : ""}
                        </span>
                        {hire?.paid_at && (
                          <Link className="small" href={`/account/receipts/${hire.id}`}>
                            Receipt
                          </Link>
                        )}
                        {st === "considering" && u.card_label && u.fee_cents != null && (
                          <form action={chargeAgreement.bind(null, u.id)}>
                            <ConfirmButton
                              className="btn btn-small btn-ghost"
                              message={`Charge ${money(u.fee_cents)} to ${u.owners.company}'s ${u.card_label} now? They'll get a receipt by email.`}
                            >
                              Charge card
                            </ConfirmButton>
                          </form>
                        )}
                        {st === "paid" && hire && (
                          <>
                            <form action={markHired.bind(null, hire.id)}>
                              <button className="btn btn-small" type="submit">
                                Mark started
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
                          </>
                        )}
                      </div>
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
