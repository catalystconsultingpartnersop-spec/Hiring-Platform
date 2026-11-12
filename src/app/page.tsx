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
            <p className={s.kicker}>A revolutionary way of hiring</p>
            <h1>
              We cracked the code. <span className={s.gold}>We found the solution to the hiring pain.</span>
            </h1>
            <p className={s.wink}>Yes, you&rsquo;re hearing right.</p>
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

      <section className={s.reveal}>
        <div className="wrap">
          <p className={s.eyebrow}>So what&rsquo;s the secret?</p>
          <h2 className={s.revealTitle}>It&rsquo;s simpler than you think.</h2>
          <ol className={s.reveals}>
            <li>
              <b>We start with the person, not the position.</b>
              <span>
                Every candidate sits down with us first. We learn their strengths, how they work, and what they really want to
                do.
              </span>
            </li>
            <li>
              <b>So the right people are already here.</b>
              <span>When you tell us about your position, we don&rsquo;t go searching. We already know who fits.</span>
            </li>
            <li>
              <b>And they actually want this kind of work.</b>
              <span>No convincing, no settling. You meet people who are looking for exactly what you&rsquo;re offering.</span>
            </li>
            <li>
              <b>You stay in charge.</b>
              <span>Your business, your call. We introduce, you choose.</span>
            </li>
            <li>
              <b>One flat $5,000 fee, paid the day you hire.</b>
              <span>
                So from the first day, you&rsquo;re both all in. <Link href="/billing">Our billing philosophy</Link>
              </span>
            </li>
          </ol>
        </div>
      </section>

      <section className={s.doubt}>
        <div className="wrap">
          <h2>Sounds too good to be true?</h2>
          <p className={s.doubtLead}>We get that. And there&rsquo;s more to it.</p>
          <ul className={s.more}>
            <li>How we get to know every candidate</li>
            <li>Why hiring works a lot like a shidduch</li>
            <li>Why we bill the way we do</li>
            <li>Who we already have for your position</li>
          </ul>
          <p className={s.doubtBody}>We&rsquo;d love to tell you the rest. Spend {MEET_MINUTES} minutes with our founders and see for yourself.</p>
          <Cta light center />
          <Link href="/why" className={s.story}>
            Or read our story first →
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
