import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { db, Hire } from "@/lib/db";
import { dateShort, money, refCode } from "@/lib/format";

import { requireOwner } from "@/lib/session";
import styles from "./account.module.css";
import { HiringFor } from "./HiringFor";
import { OwnerMatchNote } from "@/components/OwnerMatchNote";
import { ownerPositions } from "@/lib/ownerMatches";
import { bigStepIndex, loadPath, pathState, Stage } from "@/lib/path";
import { COMPANY_TZ, formatInZone } from "@/lib/time";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  candidate_id: string;
  signed_at: string;
  fee_cents: number | null;
  passed_at?: string | null;
  candidate_declined_at?: string | null;
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
  const paths = await loadPath(all.map((r) => r.id));
  const nowMs = Date.now();
  const cards = rows.map((r) => {
    const hire = [...r.hires].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const st = pathState(r, paths, { hireStatus: hire?.status, candidateStatus: r.candidates.status, nowMs });
    return { r, hire, st, col: bigStepIndex(st.stage), ...nextUp(st.stage, r.candidates.full_name.split(" ")[0], st.meeting?.starts_at ?? null, st.meeting?.time_zone ?? null) };
  });
  const yours = cards.filter((x) => x.turn === "you").length;

  return (
    <div className="wrap">
      <div className="page-head">
        <h1>Your candidates</h1>
        <p>
          {owner.full_name}, {owner.company}. Everyone you&rsquo;ve signed for is here.
          {owner.card_label && owner.card_label !== "card on file" ? ` Card on file: ${owner.card_label}.` : owner.card_pm ? " Your card is on file." : ""}
        </p>
        {cards.length > 0 && (
          <p className="notice notice-gold" style={{ marginTop: 12 }}>
            <strong>New:</strong> you can now message the rep who met each of your candidates, for an honest read before you meet. Open any
            candidate and look for &ldquo;Talk to&nbsp;…&rdquo;.
          </p>
        )}
      </div>
      {sp.hiring === "saved" && (
        <p className="notice notice-good" role="status" style={{ marginBottom: 20 }}>
          Saved. We&rsquo;ll point out candidates who fit, here and on the browse page.
        </p>
      )}
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
        <>
          {yours > 0 && (
            <p className={styles.yours}>
              <span className={styles.dotYou} /> {yours === 1 ? "1 candidate is waiting on you" : `${yours} candidates are waiting on you`}
            </p>
          )}
          <div className={styles.board}>
            {COLUMNS.map((title, col) => {
              const here = cards.filter((x) => x.col === (col === 3 ? 4 : col));
              return (
                <section key={title} className={styles.col}>
                  <h2 className={styles.colHead}>
                    {title} <span>{here.length}</span>
                  </h2>
                  {here.length === 0 ? (
                    <p className={styles.empty}>No one here yet</p>
                  ) : (
                    here.map(({ r, hire, label, turn }) => (
                      <Link key={r.id} href={`/candidates/${r.candidate_id}#next`} className={`${styles.card} ${turn === "you" ? styles.cardYou : ""}`}>
                        <span className={styles.cardName}>{r.candidates.full_name}</span>
                        {r.candidates.headline && <span className={styles.cardLine}>{r.candidates.headline}</span>}
                        <span className={`${styles.next} ${turn === "you" ? styles.nextYou : turn === "set" ? styles.nextSet : ""}`}>
                          {turn === "you" ? "Your move: " : ""}
                          {label}
                        </span>
                        {hire?.paid_at && <span className={styles.cardSmall}>Paid {dateShort(hire.paid_at)}</span>}
                      </Link>
                    ))
                  )}
                </section>
              );
            })}
          </div>
          {cards.some((x) => x.col === -1) && (
            <details className={styles.closed}>
              <summary>Not moving forward ({cards.filter((x) => x.col === -1).length})</summary>
              <ul>
                {cards
                  .filter((x) => x.col === -1)
                  .map(({ r, label }) => (
                    <li key={r.id}>
                      <Link href={`/candidates/${r.candidate_id}`}>{r.candidates.full_name}</Link> <span>{label}</span>
                    </li>
                  ))}
              </ul>
            </details>
          )}
          <details className={styles.closed}>
            <summary>Agreements, fees and receipts</summary>
            <ul>
              {cards.map(({ r, hire }) => (
                <li key={r.id}>
                  <b>{r.candidates.full_name}</b> <span>{money(hire?.amount_cents ?? r.fee_cents)} fee · signed {dateShort(r.signed_at)} · {refCode(r.candidate_id)}</span>{" "}
                  <Link href={`/account/agreements/${r.id}`}>Agreement</Link>
                  {hire?.paid_at && (
                    <>
                      {" · "}
                      <Link href={`/account/receipts/${hire.id}`}>Receipt</Link>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}

      <div style={{ marginTop: 22 }}>
        <OwnerMatchNote ownerId={owner.id} />
      </div>
      <HiringFor positions={(await ownerPositions(owner.id)).map((p) => ({ id: p.id, title: p.title, location: p.location }))} />

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

const COLUMNS = ["First call", "Meeting", "Decision", "Hired"];

// One short line per candidate: what happens next, and whose turn it is.
function nextUp(stage: Stage, first: string, at: string | null, tz: string | null): { label: string; turn: "you" | "them" | "set" | "done" } {
  const when = at ? formatInZone(at, tz || COMPANY_TZ, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
  const map: Record<Stage, { label: string; turn: "you" | "them" | "set" | "done" }> = {
    offer_call: { label: "offer times for a first call", turn: "you" },
    call_proposed: { label: `Waiting for ${first} to pick a time`, turn: "them" },
    call_retime: { label: "offer new call times", turn: "you" },
    call_booked: { label: `Call ${when}`, turn: "set" },
    call_feedback: { label: "how did the call go?", turn: "you" },
    offer_meeting: { label: "set up a meeting", turn: "you" },
    meeting_proposed: { label: `Waiting for ${first} to pick a time`, turn: "them" },
    meeting_retime: { label: "offer new meeting times", turn: "you" },
    meeting_booked: { label: `Meeting ${when}`, turn: "set" },
    meeting_feedback: { label: "how did the meeting go?", turn: "you" },
    decide: { label: "hire, meet again or pass", turn: "you" },
    refs_waiting: { label: `Waiting for ${first}'s references`, turn: "them" },
    declined: { label: `${first} decided not to continue`, turn: "done" },
    passed: { label: "You passed", turn: "done" },
    taken: { label: "Hired elsewhere", turn: "done" },
    hired: { label: "Hired 🎉", turn: "done" },
  };
  return map[stage];
}
