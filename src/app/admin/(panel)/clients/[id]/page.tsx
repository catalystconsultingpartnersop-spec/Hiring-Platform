import Link from "next/link";
import { notFound } from "next/navigation";
import { AgreementRow, latest, loadAgreements } from "@/lib/adminData";
import {
  loadFollowUp,
  nextStep,
  NUDGE_LABEL,
  NudgeKind,
  nudgeText,
  timeline,
} from "@/lib/clientFollowUp";
import { db, Owner } from "@/lib/db";
import { dateShort, money, refCode } from "@/lib/format";
import { loadPath, pathState, STAGE_TEAM_LABEL } from "@/lib/path";
import { receiptNumber } from "@/lib/receipt";
import { requireStaff } from "@/lib/session";
import { nowMs } from "@/lib/time";
import { RefundButton } from "../../RefundButton";
import styles from "../../admin.module.css";
import { removeClientNote } from "./actions";
import s from "./client.module.css";
import { NoteBox } from "./NoteBox";
import { NudgeBox } from "./NudgeBox";

export const dynamic = "force-dynamic";

const DAY = 864e5;
const short = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
const waLink = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return `https://wa.me/${d.length === 10 ? `1${d}` : d}`;
};

export default async function ClientPage({
  params,
  searchParams,
}: PageProps<"/admin/clients/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const me = await requireStaff();
  const admin = me.role === "admin";
  const { data } = await db()
    .from("owners")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const o = data as Owner & {
    created_at: string;
    last_login_at: string | null;
  };
  const now = nowMs();
  const [{ rows }, { nudges, notes }] = await Promise.all([
    loadAgreements(),
    loadFollowUp(id),
  ]);
  const mine = rows.filter((a) => a.owners.email === o.email);
  const paths = await loadPath(mine.map((a) => a.id));
  const payments = mine
    .flatMap((a) => a.hires.filter((h) => h.paid_at).map((h) => ({ h, a })))
    .sort((x, y) => (y.h.paid_at ?? "").localeCompare(x.h.paid_at ?? ""));
  const paid = payments
    .filter(({ h }) => h.status !== "refunded")
    .reduce((t, { h }) => t + h.amount_cents, 0);
  const refunded = payments
    .filter(({ h }) => h.status === "refunded")
    .reduce((t, { h }) => t + h.amount_cents, 0);
  const back = `/admin/clients/${id}`;
  const ownerFirst =
    (o.full_name ?? "").split(" ")[0] || o.company || "The client";

  const cards = mine.map((a) => {
    const u = a as AgreementRow & { owner_nudged_at?: string | null };
    const p = a.confirmed_at
      ? pathState(a, paths, {
          hireStatus: latest(a.hires)?.status,
          candidateStatus: a.candidates.status,
          nowMs: now,
        })
      : null;
    const closed =
      !!p && ["hired", "passed", "declined", "taken"].includes(p.stage);
    const ev = timeline(
      u,
      paths.meetings.filter((m) => m.unlock_id === a.id),
      paths.refs.filter((r) => r.unlock_id === a.id),
      a.hires,
      nudges.filter((n) => n.unlock_id === a.id),
      { cand: a.candidates.full_name, owner: ownerFirst },
      now,
    );
    const step = p
      ? nextStep(p, a.candidates.full_name)
      : {
          line: "Signed, but no card added yet, so the profile isn't open to them.",
          kind: null,
        };
    // The step that fits where things stand, plus a plain check-in.
    const kinds: NudgeKind[] = step.kind ? [step.kind, "checkin"] : ["checkin"];
    const options = kinds.map((k) => ({
      kind: k,
      label: NUDGE_LABEL[k],
      ...nudgeText(k, {
        owner: o.full_name,
        cand: a.candidates.full_name,
        me: me.name || me.email,
        p,
      }),
    }));
    const last = nudges.find((n) => n.unlock_id === a.id) ?? nudges[0];
    const days = last ? Math.floor((now - Date.parse(last.at)) / DAY) : 99;
    const recent =
      last && days < 7
        ? `${last.by.split(" ")[0]} emailed them ${days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`}: “${last.subject}”. Maybe give it a little time.`
        : null;
    return { a, p, closed, ev, step, options, recent };
  });
  const open = cards.filter((c) => !c.closed);
  const closed = cards.filter((c) => c.closed);
  const hired = cards.filter((c) => c.p?.stage === "hired").length;
  const lastNudge = nudges[0];
  const lastDays = lastNudge
    ? Math.floor((now - Date.parse(lastNudge.at)) / DAY)
    : 99;

  const card = ({
    a,
    p,
    closed: done,
    ev,
    step,
    options,
    recent,
  }: (typeof cards)[number]) => {
    const recentEv = ev.slice(-5);
    const earlier = ev.slice(0, -5);
    const item = (e: (typeof ev)[number], i: number) => (
      <li
        key={i}
        className={e.good ? s.good : e.bad ? s.bad : e.auto ? s.auto : ""}
      >
        <time>{short(e.at)}</time>
        {e.text}
        {e.auto && <span className={s.autoTag}>automatic</span>}
      </li>
    );
    return (
      <div key={a.id} className={`${s.card} ${done ? s.closed : ""}`}>
        <div className={s.candHead}>
          <div>
            <h3>
              <Link
                prefetch={false}
                href={`/admin/candidates/${a.candidate_id}`}
              >
                {a.candidates.full_name}
              </Link>
            </h3>
            <span className="small muted">
              {a.candidates.role_category ?? refCode(a.candidate_id)} · Fee{" "}
              {money(a.fee_cents)} ·{" "}
              <Link href={`/account/agreements/${a.id}`}>Agreement</Link>
            </span>
          </div>
          <span
            className={`tag ${p?.stage === "hired" ? "tag-good" : done ? "" : p?.stage.endsWith("booked") ? "tag-good" : "tag-gold"}`}
          >
            {p ? STAGE_TEAM_LABEL[p.stage] : "No card yet"}
          </span>
        </div>
        {!done && step.line && (
          <div className={`${s.next} ${step.kind ? "" : s.calm}`}>
            <b>{step.kind ? "Next step" : "Where it stands"}</b>
            {step.line}
          </div>
        )}
        {earlier.length > 0 && (
          <details className={s.more}>
            <summary>Earlier ({earlier.length})</summary>
            <ul className={s.tl}>{earlier.map(item)}</ul>
          </details>
        )}
        <ul className={s.tl}>{recentEv.map(item)}</ul>
        {!done && a.confirmed_at && (
          <NudgeBox
            ownerId={o.id}
            unlockId={a.id}
            options={options}
            suggested={step.kind}
            recent={recent}
          />
        )}
      </div>
    );
  };

  return (
    <>
      <p style={{ marginTop: 16 }}>
        <Link
          href={admin ? "/admin/clients" : "/admin"}
          className="small muted"
        >
          {admin ? "Clients" : "Home"}
        </Link>
      </p>
      <div className="page-head" style={{ paddingTop: 6, paddingBottom: 0 }}>
        <h1>{o.company || o.email}</h1>
        <p>
          {o.full_name} · <a href={`mailto:${o.email}`}>{o.email}</a>
          {o.phone ? ` · ${o.phone}` : ""}
        </p>
        <div className={s.contact}>
          <a className="btn btn-ghost btn-small" href={`mailto:${o.email}`}>
            ✉️ Email
          </a>
          {o.phone && (
            <>
              <a
                className="btn btn-ghost btn-small"
                href={`tel:${o.phone.replace(/[^\d+]/g, "")}`}
              >
                📞 Call
              </a>
              <a
                className="btn btn-ghost btn-small"
                href={waLink(o.phone)}
                target="_blank"
                rel="noreferrer"
              >
                💬 WhatsApp
              </a>
            </>
          )}
        </div>
      </div>
      {typeof sp.refunded === "string" && (
        <p className="notice notice-good" role="status">
          Refunded {sp.refunded}. The client was emailed, and the candidate is
          paused until you relist them.
        </p>
      )}
      {typeof sp.refund_error === "string" && (
        <p className="notice notice-bad" role="alert">
          The refund didn&rsquo;t go through: {sp.refund_error}
        </p>
      )}

      <div className={s.layout}>
        <div>
          <h2 className={styles.h2} style={{ marginTop: 0 }}>
            Candidates they signed for
          </h2>
          {mine.length === 0 && (
            <p className="panel panel-wash">
              This client hasn&rsquo;t signed for anyone yet.
            </p>
          )}
          {open.map(card)}
          {closed.length > 0 && (
            <details className={s.more}>
              <summary>Finished ({closed.length})</summary>
              {closed.map(card)}
            </details>
          )}
        </div>

        <aside>
          <div className={s.card}>
            <h3>At a glance</h3>
            <dl className={s.facts}>
              <div>
                <dt>Joined</dt>
                <dd>{dateShort(o.created_at)}</dd>
              </div>
              <div>
                <dt>Last signed in</dt>
                <dd>{dateShort(o.last_login_at)}</dd>
              </div>
              <div>
                <dt>Signed for</dt>
                <dd>{mine.filter((a) => a.confirmed_at).length}</dd>
              </div>
              <div>
                <dt>In progress</dt>
                <dd>{open.filter((c) => c.p).length}</dd>
              </div>
              <div>
                <dt>Hired</dt>
                <dd>{hired}</dd>
              </div>
              <div>
                <dt>Last email from us</dt>
                <dd>
                  {lastNudge
                    ? `${short(lastNudge.at)}, ${lastNudge.by.split(" ")[0]}`
                    : "—"}
                </dd>
              </div>
              {admin && (
                <>
                  <div>
                    <dt>Paid</dt>
                    <dd>{money(paid)}</dd>
                  </div>
                  {refunded > 0 && (
                    <div>
                      <dt>Refunded</dt>
                      <dd>{money(refunded)}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Card on file</dt>
                    <dd>{o.card_label ?? "None"}</dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          <div className={s.card}>
            <h3>📝 Team notes</h3>
            <p className="small muted" style={{ marginTop: -4 }}>
              Only the team sees these.
            </p>
            <NoteBox ownerId={o.id} />
            {notes.length > 0 && (
              <ul className={s.notes}>
                {notes.map((n) => (
                  <li key={n.id}>
                    <small>
                      <span>
                        {n.by.split(" ")[0]} · {short(n.at)}
                      </span>
                      <form action={removeClientNote.bind(null, o.id, n.id)}>
                        <button>Remove</button>
                      </form>
                    </small>
                    {n.text}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={s.card}>
            <h3>✉️ General check-in</h3>
            <p className="small muted" style={{ marginTop: -4 }}>
              Not about one candidate.
            </p>
            <NudgeBox
              ownerId={o.id}
              unlockId={null}
              options={[
                {
                  kind: "checkin",
                  label: NUDGE_LABEL.checkin,
                  ...nudgeText("checkin", {
                    owner: o.full_name,
                    cand: "",
                    me: me.name || me.email,
                    p: null,
                  }),
                },
              ]}
              suggested={null}
              recent={
                lastNudge && lastDays < 7
                  ? `${lastNudge.by.split(" ")[0]} emailed them ${lastDays === 0 ? "today" : lastDays === 1 ? "yesterday" : `${lastDays} days ago`}: “${lastNudge.subject}”. Maybe give it a little time.`
                  : null
              }
            />
          </div>
        </aside>
      </div>

      {admin && payments.length > 0 && (
        <>
          <h2 className={styles.h2}>Payments</h2>
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
                        <Link href={`/account/receipts/${h.id}`}>
                          {receiptNumber(h.id)}
                        </Link>
                      </div>
                    </td>
                    <td>
                      <Link
                        prefetch={false}
                        href={`/admin/candidates/${a.candidate_id}`}
                      >
                        {a.candidates.full_name}
                      </Link>
                      <div className="small muted">
                        {refCode(a.candidate_id)}
                      </div>
                    </td>
                    <td>{money(h.amount_cents)}</td>
                    <td>
                      {h.status === "refunded" ? (
                        <span className="tag tag-bad">
                          Refunded {dateShort(h.refunded_at)}
                        </span>
                      ) : (
                        <div
                          style={{
                            display: "grid",
                            gap: 6,
                            justifyItems: "start",
                          }}
                        >
                          <span className="tag tag-good">
                            {h.status === "hired" ? "Hired" : "Paid"}
                          </span>
                          <RefundButton
                            hireId={h.id}
                            amount={money(h.amount_cents)}
                            company={o.company ?? "this client"}
                            back={back}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
