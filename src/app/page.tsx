import { keepCandidatesOut } from "@/lib/candidateMode";
import Link from "next/link";
import s from "./landing.module.css";

export const dynamic = "force-dynamic";

function Cta({ light, center }: { light?: boolean; center?: boolean }) {
  return (
    <div className={`${s.ctaWrap} ${center ? s.center : ""}`}>
      <Link className={`btn btn-gold ${s.ctaBtn}`} href="/meet">
        Meet the founders
      </Link>
      <span className={light ? s.ctaNoteLight : s.ctaNote}>A short video call with our founders</span>
    </div>
  );
}

// The front door for business owners. The feeling we're after, in order:
// understood, then curious, then invited: we're offering a service, come hear
// what it is. One ask, everywhere: meet the founders. Browsing stays at the bottom.
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
              Here&rsquo;s how: we&rsquo;ve built a collection of candidates who are ready for their next role. We know what they do
              best and what they&rsquo;re looking for. So when you have a position to fill, there&rsquo;s a
              good chance the right person is already here.
            </p>
            <Cta light />
          </div>
          <div className={s.familiar}>
            <p className={s.familiarTitle}>Hiring right now?</p>
            <p className={s.familiarSub}>
              Come hear what we have to offer, in a short video call with our founders.
            </p>
            <ul>
              <li>Tell us about your position</li>
              <li>Hear how we work</li>
              <li>See who might be a fit</li>
              <li>Ask us anything</li>
            </ul>
            <Link className={`btn btn-gold ${s.cardBtn}`} href="/meet">
              Choose a time
            </Link>
          </div>
        </div>
      </section>

      <section className={s.offer}>
        <div className="wrap">
          <p className={s.eyebrow}>What we offer</p>
          <h2>Candidates we&rsquo;ve gotten to know, introduced to you.</h2>
          <ol className={s.steps}>
            <li>
              <b>Tell us who you need</b>
              <span>The role, the place, the kind of person who&rsquo;d thrive with you.</span>
            </li>
            <li>
              <b>Meet people we know</b>
              <span>Candidates who have sat down with us and are looking for this kind of work.</span>
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
          <h2>Come hear what we have to offer.</h2>
          <p className={s.doubtLead}>It&rsquo;s easier to explain in a conversation.</p>
          <p className={s.doubtBody}>
            Tell us about the position you&rsquo;re hiring for, and we&rsquo;ll walk you through how we work and who might be a fit.
          </p>
          <Cta light center />
        </div>
      </section>

      <section className={s.idea}>
        <div className={`wrap ${s.ideaGrid}`}>
          <div>
            <p className={s.eyebrow}>The idea behind it</p>
            <h2>Everyone has a place where they shine.</h2>
          </div>
          <div>
            <p>
              The right hire isn&rsquo;t whoever happens to be available. It&rsquo;s the person whose strengths fit the work.
            </p>
            <p>
              So we start with the person. We sit with every candidate, understand their strengths and what they really want, and
              help them see where they belong. So when a position comes along, we have a good sense of who might fit.
            </p>
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
          <h2>We&rsquo;d love to meet you.</h2>
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
