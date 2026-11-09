import { PendingButton } from "@/components/PendingButton";
import Link from "next/link";
import type { Candidate } from "@/lib/db";
import type { Busy } from "@/lib/ownerSchedule";
import { bigStepIndex, MODE_LABEL, PathState } from "@/lib/path";
import { COMPANY_TZ, formatInZone } from "@/lib/time";
import { passOnCandidate } from "./actions";
import { AlreadyAhead } from "./AlreadyAhead";
import { BringSomeone } from "./BringSomeone";
import { OfferTimes } from "./OfferTimes";
import { askReferences, ownerKeepGoing, skipStep, withdrawOffer } from "./pathActions";
import styles from "./path.module.css";

// The client's guide from "unlocked" to "hired". A nudge, never a requirement.
export function NextSteps({ c, path, again, step, guests = [], busy = [] }: { c: Candidate; path: PathState; again: boolean; step: string; guests?: { name: string; email: string }[]; busy?: Busy[] }) {
  const { stage, meeting: m, refs } = path;
  if (stage === "passed" || stage === "taken" || stage === "hired") return null;
  const first = c.full_name.split(" ")[0];
  const tz = m?.time_zone || COMPANY_TZ;
  const big = bigStepIndex(stage);
  const what = m?.kind === "meeting" ? "meeting" : "first call";
  // Anywhere before the decision, the client can say they're already further along.
  const ahead = !again && ["offer_call", "call_proposed", "call_retime", "call_booked", "offer_meeting", "meeting_proposed", "meeting_retime", "meeting_booked"].includes(stage);

  // Skip ahead: before anything is booked, the call or the meeting can be skipped.
  const skip =
    !again && ["offer_call", "call_proposed", "call_retime"].includes(stage)
      ? ("call" as const)
      : !again && ["offer_meeting", "meeting_proposed", "meeting_retime"].includes(stage)
        ? ("meeting" as const)
        : null;

  let body: React.ReactNode;
  if (stage === "declined") {
    body = (
      <div className={styles.body}>
        <h3>{first} has decided not to move forward.</h3>
        <p className="muted">Nothing is charged, and you owe nothing for {first}. There are other strong people in the collection.</p>
        <Link className="btn btn-gold btn-small" href={`/candidates${c.role_category ? `?role=${encodeURIComponent(c.role_category)}` : ""}`}>
          See similar candidates
        </Link>
      </div>
    );
  } else if (again || stage === "offer_meeting") {
    body = (
      <div className={styles.body}>
        <h3>{again ? `Meet ${first} again` : `Set up a meeting with ${first}`}</h3>
        {m?.candidate_verdict === "yes" && !again && <p className={styles.good}>{first} enjoyed the call and wants to keep going too.</p>}
        <p className={styles.sub}>Pick 3 times. {first} chooses one. You both get it in your calendar.</p>
        <Advice stage="offer_meeting" />
        <OfferTimes candidateId={c.id} kind="meeting" first={first} phone={c.phone} busy={busy} />
      </div>
    );
  } else if (stage === "offer_call") {
    body = (
      <div className={styles.body}>
        <h3>Book a short first call</h3>
        <p className={styles.sub}>Pick 3 times. {first} chooses one. You both get it in your calendar.</p>
        <Advice stage="offer_call" />
        <OfferTimes candidateId={c.id} kind="call" first={first} phone={c.phone} busy={busy} />
      </div>
    );
  } else if ((stage === "call_retime" || stage === "meeting_retime") && m) {
    body = (
      <div className={styles.body}>
        <h3>Those times didn&rsquo;t work for {first}</h3>
        <p className={styles.sub}>Offer a few new ones.</p>
        <Advice stage={stage} />
        <OfferTimes candidateId={c.id} kind={m.kind} first={first} phone={c.phone} retimeNote={m.candidate_note} busy={busy} />
      </div>
    );
  } else if ((stage === "call_proposed" || stage === "meeting_proposed") && m) {
    body = (
      <div className={styles.body}>
        <h3>Waiting for {first} to pick a time</h3>
        <Advice stage={stage} />
        <ul className={styles.times}>
          {m.slots.map((s) => (
            <li key={s}>{formatInZone(s, tz)}</li>
          ))}
        </ul>
        <p className="small muted">
          {MODE_LABEL[m.mode]}
          {m.place ? `: ${m.place}` : ""}. We&rsquo;ll email you the moment {first} picks, and remind them if they haven&rsquo;t in two days.
        </p>
        <form action={withdrawOffer.bind(null, c.id, m.id)}>
          <button className="linkish small" type="submit" style={{ marginTop: 6 }}>
            Withdraw these times and offer new ones
          </button>
        </form>
      </div>
    );
  } else if ((stage === "call_booked" || stage === "meeting_booked") && m?.starts_at) {
    body = (
      <div className={styles.body}>
        <h3>
          Your {what} is set: {formatInZone(m.starts_at, tz)}
        </h3>
        <p>
          {m.mode === "phone" ? (
            <>
              You call {first}
              {c.phone ? (
                <>
                  {" "}
                  at <a href={`tel:${c.phone}`}>{c.phone}</a>
                </>
              ) : null}
              .
            </>
          ) : m.mode === "video" ? (
            <>
              Video call: <a href={m.place ?? "#"}>{m.place}</a>
            </>
          ) : (
            <>In person at {m.place}.</>
          )}{" "}
          It&rsquo;s in your calendar invite too.
        </p>
        <Advice stage={stage} />
        <Questions kind={m.kind} first={first} />
        <BringSomeone candidateId={c.id} meetingId={m.id} guests={guests} what={what} />
      </div>
    );
  } else if ((stage === "call_feedback" || stage === "meeting_feedback") && m) {
    body = (
      <div className={styles.body}>
        <h3>How did your {what} with {first} go?</h3>
        <Advice stage={stage} />
        <div className={styles.choices}>
          <form action={ownerKeepGoing.bind(null, c.id, m.id)}>
            <button className="btn btn-gold" type="submit">
              Good, let&rsquo;s keep going
            </button>
          </form>
          <PassForm candidateId={c.id} first={first} />
        </div>
      </div>
    );
  } else if (stage === "refs_waiting") {
    body = (
      <div className={styles.body}>
        <h3>Waiting for {first}&rsquo;s references</h3>
        <Advice stage={stage} />
        <Decide c={c} first={first} withRefs={false} />
      </div>
    );
  } else {
    // decide
    body = (
      <div className={styles.body}>
        <h3>Your decision on {first}</h3>
        <Advice stage="decide" />
        {refs?.given_at && refs.refs && (
          <div className={styles.refs}>
            <p className={styles.refsTitle}>{first}&rsquo;s references</p>
            <ul>
              {refs.refs.map((r, i) => (
                <li key={i}>
                  <strong>{r.name}</strong>
                  {r.relation ? `, ${r.relation}` : ""}
                  <br />
                  <span className="small">
                    {r.phone && <a href={`tel:${r.phone}`}>{r.phone}</a>}
                    {r.phone && r.email ? " · " : ""}
                    {r.email && <a href={`mailto:${r.email}`}>{r.email}</a>}
                  </span>
                </li>
              ))}
            </ul>
            <p className="small muted" style={{ margin: 0 }}>
              <Link href="/hiring-help/articles/reference-checks">What to ask references</Link>
            </p>
          </div>
        )}
        <Decide c={c} first={first} withRefs={!refs} />
      </div>
    );
  }

  return (
    <section className={styles.panel} id="next" aria-label={`Next steps with ${first}`}>
      <div className={styles.band}>
        <p className={styles.eyebrow}>Your next step with {first}</p>
        {big >= 0 && <Stepper candidateId={c.id} big={big} canSkip={skip} />}
      </div>
      <div className={styles.inner}>
        {step === "offered" && <p className={`notice notice-good ${styles.flash}`}>Sent. We&rsquo;ll email you when {first} picks a time.</p>}
        {step === "refs" && <p className={`notice notice-good ${styles.flash}`}>Asked. We&rsquo;ll email you {first}&rsquo;s references.</p>}
        {step === "spoke" && <p className={`notice notice-good ${styles.flash}`}>Got it. Next: a proper meeting with {first}.</p>}
        {step === "set" && <p className={`notice notice-good ${styles.flash}`}>Saved. We sent you and {first} a confirmation with calendar buttons.</p>}
        {step === "skipcall" && <p className={`notice notice-good ${styles.flash}`}>Skipped. Set up a meeting with {first} below.</p>}
        {(step === "skipmeeting" || step === "skipboth") && <p className={`notice notice-good ${styles.flash}`}>Skipped. Here&rsquo;s your decision on {first}.</p>}
        {step === "met" && <p className={`notice notice-good ${styles.flash}`}>Got it. Here&rsquo;s what&rsquo;s next with {first}.</p>}
        {body}
      </div>
      <div className={styles.more}>
        {skip && (
          <form action={skipStep.bind(null, c.id, skip)}>
            <PendingButton className={styles.moreLink} pendingText="One moment…">
              {skip === "call" ? "Skip the call" : "Skip the meeting"}
            </PendingButton>
          </form>
        )}
        {ahead && <AlreadyAhead candidateId={c.id} first={first} callDone={!stage.startsWith("call") && stage !== "offer_call"} />}
        {!again && !["declined", "decide", "refs_waiting", "call_feedback", "meeting_feedback"].includes(stage) && <PassForm candidateId={c.id} first={first} />}
        {c.phone && (
          <a className={styles.moreLink} href={`tel:${c.phone}`}>
            Rather just call? {c.phone}
          </a>
        )}
      </div>
    </section>
  );
}

// 1-2-3-4 steps. A later step can be tapped to jump straight to it (skipping what's before).
function Stepper({ candidateId, big, canSkip }: { candidateId: string; big: number; canSkip: "call" | "meeting" | null }) {
  const labels = ["First call", "Meeting", "Decide", "Hire"];
  return (
    <ol className={styles.stepper}>
      {labels.map((l, i) => {
        const state = i < big ? styles.stepDone : i === big ? styles.stepNow : "";
        const inner = (
          <>
            <b>{i < big ? "✓" : i + 1}</b>
            <span className={styles.stepLabel}>{l}</span>
          </>
        );
        let el: React.ReactNode = <span className={`${styles.step} ${state}`}>{inner}</span>;
        if (i > big) {
          if (i === 3) el = <Link className={`${styles.step} ${styles.stepGo}`} href={`/candidates/${candidateId}/hire`} title="Go straight to hiring">{inner}</Link>;
          else if (canSkip) {
            const kind = i === 1 ? "call" : canSkip === "call" ? "both" : "meeting";
            el = (
              <form action={skipStep.bind(null, candidateId, kind)}>
                <button type="submit" className={`${styles.step} ${styles.stepGo}`} title={`Skip ahead to ${l.toLowerCase()}`}>
                  {inner}
                </button>
              </form>
            );
          }
        }
        return (
          <li key={l}>
            {i > 0 && <span className={styles.line} aria-hidden />}
            {el}
          </li>
        );
      })}
    </ol>
  );
}

function Decide({ c, first, withRefs }: { c: Candidate; first: string; withRefs: boolean }) {
  return (
    <div className={styles.decide}>
      <Link className={`${styles.option} ${styles.optionMain}`} href={`/candidates/${c.id}/hire`}>
        <strong>Hire {first}</strong>
        <span>See exactly what happens before anything is charged.</span>
      </Link>
      <Link className={styles.option} href={`/candidates/${c.id}?again=1#next`}>
        <strong>Meet again</strong>
        <span>Another conversation, or meet the team.</span>
      </Link>
      {withRefs && (
        <details className={styles.option}>
          <summary>
            <strong>Ask for references</strong>
            <span>{first} sends two or three people to call.</span>
          </summary>
          <form action={askReferences.bind(null, c.id)}>
            <input className="input" name="note" maxLength={500} placeholder="Anything specific? (optional)" />
            <button className="btn btn-small" type="submit" style={{ marginTop: 8 }}>
              Ask {first}
            </button>
          </form>
        </details>
      )}
      <PassForm candidateId={c.id} first={first} asOption />
    </div>
  );
}

function PassForm({ candidateId, first, asOption = false }: { candidateId: string; first: string; asOption?: boolean }) {
  return (
    <details className={asOption ? styles.option : styles.passInline}>
      <summary>
        <strong>{asOption ? "Not a fit" : "Not a fit?"}</strong>
        {asOption && <span>We&rsquo;ll let {first} know kindly.</span>}
      </summary>
      <form action={passOnCandidate.bind(null, candidateId)}>
        <input type="hidden" name="reason" value="We met, and it wasn't the right fit" />
        <input className="input" name="note" maxLength={500} placeholder="Anything we should know? (optional)" />
        <PendingButton className="btn btn-small btn-ghost" pendingText="Removing…" style={{ marginTop: 8 }}>
          Take {first} off my list
        </PendingButton>
      </form>
    </details>
  );
}

// One line of real advice for each step, so it feels like someone is guiding them.
const ADVICE: Partial<Record<PathState["stage"], string>> = {
  offer_call: "Offer 3 times for a short call. You're only answering one question: do I want to meet this person?",
  call_proposed: "While you wait, read their one-page summary so you know who you're talking to.",
  call_retime: "Offer a wider spread this time: one morning, one afternoon, one evening.",
  call_booked: "Open the one-page summary before the call, and spend most of it listening.",
  call_feedback: "Tell us how it went while it's fresh. A quick yes or no is kinder to everyone.",
  offer_meeting: "Meet in person if you can, and bring whoever they'd work with most.",
  meeting_proposed: "Nothing to do yet. We'll remind them if they haven't picked in two days.",
  meeting_retime: "Offer a wider spread this time: one morning, one afternoon, one evening.",
  meeting_booked: "Ask about real situations from their past, then score them on the scorecard right after.",
  meeting_feedback: "Tell us how it went while it's fresh. A quick yes or no is kinder to everyone.",
  decide: "Look over your notes and the scorecard. Not sure yet? Meet again or ask for references. There's no rush.",
  refs_waiting: "You can decide now, or wait a day or two for the references.",
};

const QUESTIONS: Record<"call" | "meeting", string[]> = {
  call: ["What kind of work gives you energy?", "What are you looking for next?", "What would you like to know about us?"],
  meeting: [
    "Tell me about a time you had to fix something that was falling apart.",
    "What would your last manager say you're best at?",
    "What would a great first month here look like to you?",
  ],
};

function Advice({ stage }: { stage: PathState["stage"] }) {
  const a = ADVICE[stage];
  if (!a) return null;
  return (
    <div className={styles.tip}>
      <span aria-hidden>💡</span>
      <p>
        <strong>Suggested next step</strong>
        {a}
      </p>
    </div>
  );
}

function Questions({ kind, first }: { kind: "call" | "meeting"; first: string }) {
  return (
    <details className={styles.questions}>
      <summary>🗒️ 3 questions to ask {first}</summary>
      <ol>
        {QUESTIONS[kind].map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ol>
      {kind === "meeting" && (
        <p className="small" style={{ margin: "8px 0 0" }}>
          <Link href="/hiring-help/templates/interview-scorecard">Open the interview scorecard</Link>
        </p>
      )}
    </details>
  );
}
