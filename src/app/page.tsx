import { keepCandidatesOut } from "@/lib/candidateMode";
import Link from "next/link";
import { leaders, MEET_MINUTES } from "@/lib/meetUs";
import s from "./landing.module.css";

export const dynamic = "force-dynamic";

function Cta() {
  return (
    <div className={s.ctaWrap}>
      <Link className={`btn btn-gold ${s.ctaBtn}`} href="/meet">
        Book a call with us →
      </Link>
      <span className={s.ctaNote}>{MEET_MINUTES} minutes · video or phone · free, no commitment</span>
    </div>
  );
}

// The front door for business owners. For now the point is to meet us: owners
// who don't know us yet won't hire from a catalog, so the page builds trust and
// asks for one thing, a short call. Browsing stays, quietly, at the bottom.
export default async function Home() {
  await keepCandidatesOut();
  const team = await leaders().catch(() => []);
  const names = team.map((l) => l.first).join(" and ") || "our team";

  return (
    <>
      <section className={s.hero}>
        <div className={`wrap ${s.heroGrid}`}>
          <div>
            <p className={s.kicker}>For business owners who are hiring</p>
            <h1>Tell us who you need. We&rsquo;ll introduce you to people who want the job.</h1>
            <p className={s.lede}>
              We meet every candidate one-on-one before we list them. Tell us about your opening on a short call, and we&rsquo;ll
              introduce you to people who are available and want this kind of work.
            </p>
            <Cta />
          </div>
          <div className={s.meetCard}>
            <p className={s.meetTitle}>On the call</p>
            <ul className={s.meetList}>
              <li>You tell us about the job</li>
              <li>We explain how we vet our candidates</li>
              <li>We tell you honestly if we have someone for it</li>
            </ul>
            <p className={s.meetSub}>
              With {names}, the people behind The Candidate Collection. {MEET_MINUTES} minutes, free.
            </p>
            <Link className={`btn btn-gold ${s.cardBtn}`} href="/meet">
              Pick a time
            </Link>
          </div>
        </div>
      </section>

      <section className={s.how}>
        <div className="wrap">
          <h2>How it works</h2>
          <ol className={s.steps}>
            <li>
              <b>Book a call</b>
              <span>Tell us what you&rsquo;re hiring for.</span>
            </li>
            <li>
              <b>We find who fits</b>
              <span>From people we&rsquo;ve already met, who are available and want your kind of work.</span>
            </li>
            <li>
              <b>You interview them</b>
              <span>Meet them yourself. Hire who you like, when you&rsquo;re ready.</span>
            </li>
          </ol>
        </div>
      </section>

      <section className={s.vet}>
        <div className={`wrap ${s.vetGrid}`}>
          <div>
            <h2>We meet every candidate first</h2>
            <p className={s.sub}>We only list people we&rsquo;ve sat down with.</p>
          </div>
          <ul className={s.vetList}>
            <li>
              <b>A one-on-one conversation</b>
              <span>About their experience, their strengths and what they&rsquo;re looking for.</span>
            </li>
            <li>
              <b>Our strengths assessment</b>
              <span>So we know how each person works best.</span>
            </li>
            <li>
              <b>The work they actually want</b>
              <span>You only meet people who want the kind of job you&rsquo;re offering.</span>
            </li>
          </ul>
        </div>
      </section>

      <section className={s.us}>
        <div className="wrap">
          <p className={s.label}>Our mission</p>
          <h2 className={s.mission}>
            We help people discover their natural strengths and character, so they can find work that truly fits them.
          </h2>
          <p className={s.missionKicker}>And a person in the right job is the best hire you&rsquo;ll ever make.</p>
        </div>
      </section>

      <section className={s.fee}>
        <div className={`wrap ${s.feeGrid}`}>
          <div className={s.feeBig}>$5,000</div>
          <div>
            <h2>One flat fee, only if you hire.</h2>
            <p>Never a percentage of salary. The call is free, and nothing is charged until you decide to hire.</p>
          </div>
        </div>
      </section>

      <section className={s.closing}>
        <div className="wrap">
          <h2>Hiring? Let&rsquo;s talk.</h2>
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
