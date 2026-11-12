import { keepCandidatesOut } from "@/lib/candidateMode";
import Link from "next/link";
import { Faces } from "@/components/Faces";
import { leaders, MEET_MINUTES } from "@/lib/meetUs";
import s from "./landing.module.css";

export const dynamic = "force-dynamic";

// The front door for business owners. For now the point is to meet us: owners
// who don't know us yet won't hire from a catalog, so the page builds trust and
// asks for one thing, a short call. Browsing stays, quietly, at the bottom.
function Cta({ light }: { light?: boolean }) {
  return (
    <div className={s.ctaWrap}>
      <Link className={`btn btn-gold ${s.ctaBtn}`} href="/meet">
        Book a call with us →
      </Link>
      <span className={light ? s.ctaNoteLight : s.ctaNote}>
        {MEET_MINUTES} minutes · video or phone · free, no commitment
      </span>
    </div>
  );
}

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
              We sit down with every candidate before we list them, so we know who&rsquo;s available, what they&rsquo;re great at, and
              what work they actually want. Book a short call, tell us about your opening, and meet people who fit.
            </p>
            <Cta light />
          </div>
          <div className={s.meetCard}>
            <Faces people={team} size={78} />
            <p className={s.meetTitle}>Talk to {names}</p>
            <p className={s.meetSub}>The people behind The Candidate Collection. Real people, not an algorithm.</p>
            <ul className={s.meetList}>
              <li>Tell us about the job, in your words</li>
              <li>Hear exactly how we vet our candidates</li>
              <li>Get an honest answer: do we have someone?</li>
            </ul>
            <Link className={`btn btn-gold ${s.cardBtn}`} href="/meet">
              Pick a time
            </Link>
          </div>
        </div>
      </section>

      <section className={s.why}>
        <div className="wrap">
          <h2>Why start with a call?</h2>
          <p className={s.sub}>Because hiring is about trust. Before you trust us with a hire, you should know who we are.</p>
          <div className={s.reasons}>
            <div>
              <h3>Meet the people behind it</h3>
              <p>You talk to {names}, not a bot or a sales line. See who you&rsquo;re trusting with your next hire.</p>
            </div>
            <div>
              <h3>Say it in your words</h3>
              <p>A real conversation about the job, the pace, and the kind of person who&rsquo;d thrive with you. No long forms.</p>
            </div>
            <div>
              <h3>Get a straight answer</h3>
              <p>We tell you honestly whether we have someone right for it. If we do, we line up an interview.</p>
            </div>
            <div>
              <h3>See why it&rsquo;s worth it</h3>
              <p>You hear exactly how we get to know every candidate, and why that makes for a better hire.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={s.how}>
        <div className="wrap">
          <h2>How it works</h2>
          <ol className={s.steps}>
            <li>
              <b>Book a call</b>
              <span>{MEET_MINUTES} minutes with us. Tell us what you&rsquo;re hiring for.</span>
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
            <h2>Every candidate sits down with us first</h2>
            <p className={s.sub}>We only list people we&rsquo;ve met. Here&rsquo;s what that means:</p>
          </div>
          <ul className={s.vetList}>
            <li>
              <b>A one-on-one conversation</b>
              <span>With someone on our team, about their experience, their strengths and what they&rsquo;re looking for.</span>
            </li>
            <li>
              <b>Our strengths assessment</b>
              <span>So we know how each person works best, and where they&rsquo;ll shine.</span>
            </li>
            <li>
              <b>The work they actually want</b>
              <span>You only meet people who are looking for the kind of job you&rsquo;re offering.</span>
            </li>
          </ul>
        </div>
      </section>

      <section className={s.us}>
        <div className="wrap">
          <p className={s.label}>Who we are</p>
          <div className={s.people}>
            {team.map((l) => (
              <div key={l.id} className={s.person}>
                <Faces people={[l]} size={72} />
                <div>
                  <b>{l.name}</b>
                  <span className={s.role}>{l.title}</span>
                  {(l.line || l.bio) && <p>{l.line || l.bio}</p>}
                </div>
              </div>
            ))}
          </div>
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
