import Link from "next/link";
import { MODE_LABEL, PathState } from "@/lib/path";
import { formatInZone } from "@/lib/time";
import { candidateKeepGoing, declineEmployer, noTimesWork, pickTime, sendReferences } from "./actions";
import styles from "./intros.module.css";

export type Intro = { id: string; company: string; contact: string | null; path: PathState };

// Each employer who wants to meet the candidate, and what to do next.
export function Intros({ intros, tz, now }: { intros: Intro[]; tz: string; now: number }) {
  if (!intros.length) return null;
  return (
    <section className={styles.wrap} id="intros">
      <h2 className={styles.h2}>Employers who want to meet you</h2>
      <p className="small muted" style={{ margin: "4px 0 14px" }}>
        You&rsquo;re always free to say no. Your rep sees each step and is here to help.
      </p>
      <div className={styles.list}>
        {intros.map((i) => (
          <IntroCard key={i.id} intro={i} tz={tz} now={now} />
        ))}
      </div>
    </section>
  );
}

function IntroCard({ intro, tz, now }: { intro: Intro; tz: string; now: number }) {
  const { stage, meeting: m, refs } = intro.path;
  const co = intro.company;
  const what = m?.kind === "meeting" ? "meeting" : "first call";
  const closed = stage === "declined" || stage === "passed" || stage === "taken";

  let status: string;
  let body: React.ReactNode = null;
  switch (stage) {
    case "offer_call":
    case "call_retime":
    case "meeting_retime":
      status = "Waiting for times";
      body = <p>{co} will suggest a few times soon. We&rsquo;ll email you the moment they do.</p>;
      break;
    case "offer_meeting":
      status = "Next: a meeting";
      body = <p>{co} would like to keep going. They&rsquo;ll suggest times for a proper meeting.</p>;
      break;
    case "call_proposed":
    case "meeting_proposed":
      status = "Pick a time";
      body = m && (
        <>
          <p>
            {co} would like {m.kind === "call" ? "a first call" : "to meet"}: {m.minutes} minutes,{" "}
            {MODE_LABEL[m.mode].toLowerCase()}
            {m.mode === "in_person" && m.place ? ` at ${m.place}` : ""}.
          </p>
          {m.note && <p className={styles.note}>&ldquo;{m.note}&rdquo;</p>}
          <form action={pickTime.bind(null, m.id)} className={styles.pick}>
            {m.slots
              .filter((s) => Date.parse(s) > now)
              .map((s, n) => (
                <label key={s}>
                  <input type="radio" name="slot" value={s} defaultChecked={n === 0} required />
                  {formatInZone(s, tz)}
                </label>
              ))}
            <button className="btn btn-gold" type="submit">
              Book this time
            </button>
          </form>
          <details className={styles.more}>
            <summary>None of these work</summary>
            <form action={noTimesWork.bind(null, m.id)}>
              <input className="input" name="note" maxLength={500} placeholder="When works better? e.g. weekday mornings" />
              <button className="btn btn-small btn-ghost" type="submit" style={{ marginTop: 8 }}>
                Ask for other times
              </button>
            </form>
          </details>
        </>
      );
      break;
    case "call_booked":
    case "meeting_booked":
      status = "Booked";
      body = m?.starts_at && (
        <>
          <p className={styles.when}>{formatInZone(m.starts_at, tz)}</p>
          <p>
            {m.mode === "phone" ? `${intro.contact ?? co} will call you.` : m.mode === "video" ? (
              <>
                Video call: <a href={m.place ?? "#"}>{m.place}</a>
              </>
            ) : (
              <>In person at {m.place}.</>
            )}{" "}
            It&rsquo;s in your calendar invite too.
          </p>
          <p className="small">
            <Link href="/join/help/get-ready-for-an-interview">Getting ready for an interview</Link> ·{" "}
            <Link href="/join/help/talk-about-your-strengths">Talking about your strengths</Link>
          </p>
        </>
      );
      break;
    case "call_feedback":
    case "meeting_feedback":
    case "decide":
      if (m && !m.candidate_verdict) {
        status = "How did it go?";
        body = (
          <>
            <p>How was your {what} with {co}? Would you like to keep going? Only your rep and we see your answer.</p>
            <div className={styles.row}>
              <form action={candidateKeepGoing.bind(null, m.id)}>
                <button className="btn btn-gold" type="submit">
                  Yes, I&rsquo;d like to keep going
                </button>
              </form>
            </div>
          </>
        );
      } else {
        status = stage === "decide" ? "They're deciding" : "Waiting on them";
        body = <p>Thanks for letting us know. {co} is thinking it over, and we&rsquo;ll tell you as soon as we hear.</p>;
      }
      break;
    case "refs_waiting":
      status = "References requested";
      body = refs && (
        <>
          <p>
            Great sign: {co} would like to talk to two or three people you&rsquo;ve worked with. A former manager is best. Give
            them a quick heads-up.
          </p>
          {refs.note && <p className={styles.note}>&ldquo;{refs.note}&rdquo;</p>}
          <form action={sendReferences.bind(null, refs.id)} className={styles.refs}>
            {[0, 1, 2].map((n) => (
              <fieldset key={n}>
                <legend>Reference {n + 1}{n > 0 ? " (optional)" : ""}</legend>
                <input className="input" name="ref_name" placeholder="Name" required={n === 0} />
                <input className="input" name="ref_relation" placeholder="How you know them" />
                <input className="input" name="ref_phone" type="tel" placeholder="Phone" />
                <input className="input" name="ref_email" type="email" placeholder="Email" />
              </fieldset>
            ))}
            <button className="btn btn-gold" type="submit">
              Send to {co}
            </button>
          </form>
        </>
      );
      break;
    case "hired":
      status = "Hired!";
      body = <p>Congratulations on your new role with {co}. We&rsquo;re so glad for you.</p>;
      break;
    case "declined":
      status = "You passed";
      body = <p>You let {co} know it&rsquo;s not for you. That&rsquo;s completely fine.</p>;
      break;
    case "passed":
      status = "Not this time";
      body = <p>{co} went a different direction. It says nothing about what you&rsquo;re worth. Other employers are browsing.</p>;
      break;
    default:
      status = "Hired elsewhere";
  }

  return (
    <article className={`${styles.card} ${closed ? styles.closed : ""}`}>
      <div className={styles.top}>
        <div>
          <p className={styles.co}>{co}</p>
          {intro.contact && <p className="small muted" style={{ margin: 0 }}>{intro.contact}</p>}
        </div>
        <span className={`tag ${stage === "hired" ? "tag-good" : closed ? "" : "tag-gold"}`}>{status}</span>
      </div>
      <div className={styles.body}>{body}</div>
      {!closed && stage !== "hired" && (
        <details className={styles.more}>
          <summary>Not for me</summary>
          <form action={declineEmployer.bind(null, intro.id)}>
            <p className="small muted" style={{ margin: "8px 0" }}>
              We&rsquo;ll let {co} know kindly. You don&rsquo;t have to give a reason, but it helps us find you better matches.
            </p>
            <input className="input" name="note" maxLength={500} placeholder="Why? (optional, only we see this)" />
            <button className="btn btn-small btn-ghost" type="submit" style={{ marginTop: 8 }}>
              Let them know
            </button>
          </form>
        </details>
      )}
    </article>
  );
}
