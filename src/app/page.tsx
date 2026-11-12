import { keepCandidatesOut } from "@/lib/candidateMode";
import Link from "next/link";
import { MEET_MINUTES } from "@/lib/meetUs";
import s from "./landing.module.css";

export const dynamic = "force-dynamic";

function Cta({ light, center }: { light?: boolean; center?: boolean }) {
  return (
    <div className={`${s.ctaWrap} ${center ? s.center : ""}`}>
      <Link className={`btn btn-gold ${s.ctaBtn}`} href="/meet">
        Meet the founders
      </Link>
      <span className={light ? s.ctaNoteLight : s.ctaNote}>A {MEET_MINUTES}-minute call · video or phone · no cost, no commitment</span>
    </div>
  );
}

// The front door for business owners. The feeling we're after, in order:
// understood ("that's exactly my experience"), relieved ("finally"), a little
// skeptical ("too good to be true... who's behind this?"), and curious enough
// to meet the founders. One ask, everywhere: meet us. Browsing stays at the bottom.
export default async function Home() {
  await keepCandidatesOut();

  return (
    <>
      <section className={s.hero}>
        <div className={`wrap ${s.heroGrid}`}>
          <div>
            <p className={s.kicker}>For business owners who are hiring</p>
            <h1>
              A revolutionary way of hiring. <span className={s.gold}>It starts with a conversation.</span>
            </h1>
            <p className={s.lede}>
              You know your business, and you know the kind of person you need. Chances are, we&rsquo;ve already met them. Let us introduce you.
            </p>
            <Cta light />
          </div>
          <div className={s.familiar}>
            <p className={s.familiarTitle}>We&rsquo;re here to talk.</p>
            <p className={s.familiarSub}>
              Behind The Candidate Collection are real people, and we&rsquo;d like to hear from you.
            </p>
            <ul>
              <li>Talk with the founders themselves</li>
              <li>We listen first: your business, your position</li>
              <li>Ask us anything, see if it&rsquo;s right for you</li>
              <li>No pressure, no commitment</li>
            </ul>
            <Link className={`btn btn-gold ${s.cardBtn}`} href="/meet">
              Choose a time
            </Link>
          </div>
        </div>
      </section>

      <section className={s.offer}>
        <div className="wrap">
          <p className={s.eyebrow}>Here&rsquo;s the new way</p>
          <h2>You tell us the position. The right people are already here.</h2>
          <ol className={s.steps}>
            <li>
              <b>Tell us who you need</b>
              <span>The role, the place, the kind of person who&rsquo;d thrive with you.</span>
            </li>
            <li>
              <b>Meet people we already know</b>
              <span>Every candidate has sat down with us. They&rsquo;re available, and they want exactly this kind of work.</span>
            </li>
            <li>
              <b>Hire who you like</b>
              <span>Meet them, interview them, take your time. One flat fee, only when you hire.</span>
            </li>
          </ol>
          <ul className={s.nos}>
            <li>A few great options, not a pile of résumés</li>
            <li>People who want this kind of work</li>
            <li>Your business, your call</li>
          </ul>
        </div>
      </section>

      <section className={s.doubt}>
        <div className="wrap">
          <h2>Sounds too good to be true?</h2>
          <p className={s.doubtLead}>We get that. It&rsquo;s exactly why we&rsquo;d like to meet you.</p>
          <p className={s.doubtBody}>
            Before you trust anyone with a hire, you should know who&rsquo;s behind it. Spend {MEET_MINUTES} minutes with our founders.
            Tell us about the position, hear how we get to know every candidate, and decide for yourself.
          </p>
          <Cta light center />
        </div>
      </section>

      <section className={s.idea}>
        <div className={`wrap ${s.ideaGrid}`}>
          <div>
            <p className={s.eyebrow}>The idea behind it</p>
            <h2>Hiring is a lot like a shidduch.</h2>
          </div>
          <div>
            <p>
              You don&rsquo;t find the right match by grabbing whoever happens to be available. Everyone has a place where they shine.
            </p>
            <p>
              So we start with the person. We sit with every candidate, understand their strengths and what they really want, and
              help them see where they belong. When your position comes along, the fit is already there.
            </p>
            <Link href="/why" className={s.storyDark}>
              Read our story →
            </Link>
          </div>
        </div>
      </section>

      <section className={s.fee}>
        <div className={`wrap ${s.feeLine}`}>
          <p>
            <b>One flat fee of $5,000, paid the day you hire.</b> Never a percentage of salary, and nothing at all if you don&rsquo;t hire.
          </p>
          <Link href="/billing" className={s.storyDark}>
            Our billing philosophy →
          </Link>
        </div>
      </section>

      <section className={s.closing}>
        <div className="wrap">
          <h2>Who&rsquo;s behind this? Come find out.</h2>
          <Cta center />
          <p className={s.browse}>
            Rather look around first? <Link href="/candidates">Browse candidates</Link>
          </p>
          <p className={s.seeker}>
            Looking for work yourself? <Link href="/join">Start here</Link>
          </p>
        </div>
      </section>
    </>
  );
}
