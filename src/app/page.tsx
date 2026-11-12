import { keepCandidatesOut } from "@/lib/candidateMode";
import Link from "next/link";
import { leaders, MEET_MINUTES } from "@/lib/meetUs";
import s from "./landing.module.css";

export const dynamic = "force-dynamic";

function Cta({ light }: { light?: boolean }) {
  return (
    <div className={s.ctaWrap}>
      <Link className={`btn btn-gold ${s.ctaBtn}`} href="/meet">
        Schedule a call
      </Link>
      <span className={light ? s.ctaNoteLight : s.ctaNote}>{MEET_MINUTES} minutes · video or phone · no cost, no commitment</span>
    </div>
  );
}

// The front door for business owners. For now the point is to meet us: owners
// who don't know us yet won't hire from a catalog, so the page builds trust and
// asks for one thing, a short call. Browsing stays, quietly, at the bottom.
export default async function Home() {
  await keepCandidatesOut();
  const team = await leaders().catch(() => []);

  return (
    <>
      <section className={s.hero}>
        <div className={`wrap ${s.heroGrid}`}>
          <div>
            <p className={s.kicker}>For business owners who are hiring</p>
            <h1>Tell us who you need. Meet people who want the job.</h1>
            <p className={s.lede}>
              We interview every candidate one-on-one before they&rsquo;re listed. Share your opening on a short call with our founders,
              and we&rsquo;ll introduce you to people who are available and right for the role.
            </p>
            <Cta light />
          </div>
          <div className={s.meetCard}>
            <p className={s.meetTitle}>Speak with our founders</p>
            <p className={s.meetSub}>Before you trust anyone with a hire, you should know who they are.</p>
            <ul className={s.meetList}>
              <li>Walk us through the role and what matters to you</li>
              <li>See exactly how we vet every candidate</li>
              <li>Get a straight answer on whether we have the right person</li>
            </ul>
            <Link className={`btn btn-gold ${s.cardBtn}`} href="/meet">
              Choose a time
            </Link>
          </div>
        </div>
      </section>

      <section className={s.how}>
        <div className="wrap">
          <p className={s.eyebrow}>How it works</p>
          <h2>Three steps to the right hire</h2>
          <ol className={s.steps}>
            <li>
              <b>Schedule a call</b>
              <span>Tell us about the role and the person you&rsquo;re looking for.</span>
            </li>
            <li>
              <b>We introduce the right people</b>
              <span>Candidates we&rsquo;ve already met, who are available and want this kind of work.</span>
            </li>
            <li>
              <b>You interview and decide</b>
              <span>Meet them yourself and hire who you like. You pay only if you hire.</span>
            </li>
          </ol>
        </div>
      </section>

      <section className={s.vet}>
        <div className={`wrap ${s.vetGrid}`}>
          <div>
            <p className={s.eyebrow}>Our standard</p>
            <h2>Every candidate is interviewed before they&rsquo;re listed</h2>
          </div>
          <ul className={s.vetList}>
            <li>
              <b>A one-on-one interview</b>
              <span>Their experience, their strengths, and what they&rsquo;re looking for next.</span>
            </li>
            <li>
              <b>Our strengths assessment</b>
              <span>So we understand how each person works best.</span>
            </li>
            <li>
              <b>The work they actually want</b>
              <span>You only meet people who are looking for the kind of role you&rsquo;re offering.</span>
            </li>
          </ul>
        </div>
      </section>

      <section className={s.us}>
        <div className="wrap">
          <p className={s.eyebrowLight}>Who you&rsquo;ll speak with</p>
          <div className={s.people}>
            {team.map((l) => (
              <div key={l.id} className={s.person}>
                <b>{l.name}</b>
                <span className={s.role}>{l.title}</span>
                {(l.line || l.bio) && <p>{l.line || l.bio}</p>}
              </div>
            ))}
          </div>
          <blockquote className={s.mission}>
            &ldquo;We help people discover their natural strengths and character, so they can find work that truly fits them. And a person in the
            right job is the best hire you&rsquo;ll ever make.&rdquo;
          </blockquote>
        </div>
      </section>

      <section className={s.fee}>
        <div className="wrap">
          <div className={s.feeGrid}>
            <div className={s.feeBig}>$5,000</div>
            <div>
              <h2>One flat fee, only if you hire.</h2>
              <p>Never a percentage of salary. The call costs nothing, and nothing is charged until you decide to hire.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={s.closing}>
        <div className="wrap">
          <h2>Let&rsquo;s find your next hire.</h2>
          <Cta />
          <p className={s.browse}>
            Prefer to look around first? <Link href="/candidates">Browse candidates</Link>
          </p>
          <p className={s.seeker}>
            Looking for work yourself? <Link href="/join">Start here</Link>
          </p>
        </div>
      </section>
    </>
  );
}
