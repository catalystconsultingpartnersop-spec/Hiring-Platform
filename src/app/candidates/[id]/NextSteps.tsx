import Link from "next/link";
import type { Candidate } from "@/lib/db";
import { BIG_STEPS, bigStepIndex, MODE_LABEL, PathState } from "@/lib/path";
import { COMPANY_TZ, formatInZone } from "@/lib/time";
import { passOnCandidate } from "./actions";
import { OfferTimes } from "./OfferTimes";
import { askReferences, ownerKeepGoing, withdrawOffer } from "./pathActions";
import styles from "./path.module.css";

// The client's guide from "unlocked" to "hired". A nudge, never a requirement.
export function NextSteps({ c, path, again, step }: { c: Candidate; path: PathState; again: boolean; step: string }) {
  const { stage, meeting: m, refs } = path;
  if (stage === "passed" || stage === "taken" || stage === "hired") return null;
  const first = c.full_name.split(" ")[0];
  const tz = m?.time_zone || COMPANY_TZ;
  const big = bigStepIndex(stage);
  const what = m?.kind === "meeting" ? "meeting" : "first call";

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
        <h3>{again ? `Meet ${first} again` : `Next: a proper meeting with ${first}`}</h3>
        {m?.candidate_verdict === "yes" && !again && <p className={styles.good}>{first} enjoyed the call and wants to keep going too.</p>}
        <p className="muted">In person is best if you can. Offer a few times and {first} picks one.</p>
        <OfferTimes candidateId={c.id} kind="meeting" first={first} phone={c.phone} />
      </div>
    );
  } else if (stage === "offer_call") {
    body = (
      <div className={styles.body}>
        <h3>Start with a short first call</h3>
        <p className="muted">
          Fifteen or twenty minutes to say hello and see if it&rsquo;s worth meeting. Offer a few times and {first} picks one.
        </p>
        <OfferTimes candidateId={c.id} kind="call" first={first} phone={c.phone} />
      </div>
    );
  } else if ((stage === "call_retime" || stage === "meeting_retime") && m) {
    body = (
      <div className={styles.body}>
        <h3>Those times didn&rsquo;t work for {first}</h3>
        <p className="muted">Offer a few new ones.</p>
        <OfferTimes candidateId={c.id} kind={m.kind} first={first} phone={c.phone} retimeNote={m.candidate_note} />
      </div>
    );
  } else if ((stage === "call_proposed" || stage === "meeting_proposed") && m) {
    body = (
      <div className={styles.body}>
        <h3>Waiting for {first} to pick a time</h3>
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
        {m.kind === "call" ? (
          <p className="small muted">
            Good first questions: What kind of work gives you energy? What are you looking for next? What would you like to know about us?
          </p>
        ) : (
          <p className="small muted">
            Use the <Link href="/hiring-help/templates/interview-scorecard">interview scorecard</Link> to keep it fair and easy to decide.
          </p>
        )}
      </div>
    );
  } else if ((stage === "call_feedback" || stage === "meeting_feedback") && m) {
    body = (
      <div className={styles.body}>
        <h3>How did your {what} with {first} go?</h3>
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
        <p className="muted">We asked {first} for two or three people they&rsquo;ve worked with. We&rsquo;ll email them to you as soon as they&rsquo;re in.</p>
        <Decide c={c} first={first} withRefs={false} />
      </div>
    );
  } else {
    // decide
    body = (
      <div className={styles.body}>
        <h3>What&rsquo;s next with {first}?</h3>
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
      <div className={styles.head}>
        <p className={styles.eyebrow}>Next steps with {first}</p>
        {big >= 0 && (
          <ol className={styles.dots}>
            {BIG_STEPS.map((s, i) => (
              <li key={s} className={i < big ? styles.dotDone : i === big ? styles.dotNow : undefined}>
                {s}
              </li>
            ))}
          </ol>
        )}
      </div>
      {step === "offered" && <p className={`notice notice-good ${styles.flash}`}>Sent. We&rsquo;ll email you when {first} picks a time.</p>}
      {step === "refs" && <p className={`notice notice-good ${styles.flash}`}>Asked. We&rsquo;ll email you {first}&rsquo;s references.</p>}
      {body}
      <p className={styles.phone}>
        Prefer to just pick up the phone? Call {first}
        {c.phone ? (
          <>
            {" "}
            at <a href={`tel:${c.phone}`}>{c.phone}</a>
          </>
        ) : null}
        . These steps are here to help, not required.
      </p>
    </section>
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
        <strong>Not a fit</strong>
        {asOption && <span>We&rsquo;ll let {first} know kindly.</span>}
      </summary>
      <form action={passOnCandidate.bind(null, candidateId)}>
        <input type="hidden" name="reason" value="We met, and it wasn't the right fit" />
        <input className="input" name="note" maxLength={500} placeholder="Anything we should know? (optional)" />
        <button className="btn btn-small btn-ghost" type="submit" style={{ marginTop: 8 }}>
          Take {first} off my list
        </button>
      </form>
    </details>
  );
}
