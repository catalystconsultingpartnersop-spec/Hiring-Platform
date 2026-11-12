import { keepCandidatesOut } from "@/lib/candidateMode";
import { db } from "@/lib/db";
import Link from "next/link";
import s from "./landing.module.css";

export const dynamic = "force-dynamic";

function Cta({ light, center }: { light?: boolean; center?: boolean }) {
  return (
    <div className={`${s.ctaWrap} ${center ? s.center : ""}`}>
      <Link className={`btn btn-gold ${s.ctaBtn}`} href="/meet">
        Tell us who you need
      </Link>
      <span className={light ? s.ctaNoteLight : s.ctaNote}>Our team takes it from there</span>
    </div>
  );
}

// The front door for business owners. The feeling we're after, in order:
// understood, then curious, then invited: we're offering a service, come hear
// what it is. One ask, everywhere: meet the team. Browsing stays at the bottom.
export default async function Home() {
  await keepCandidatesOut();
  // The real number of candidates ready right now, never a made-up one.
  const { count } = await db().from("candidates").select("id", { count: "exact", head: true }).eq("status", "listed");
  const n = (count ?? 0) >= 10 ? count : null;

  return (
    <>
      <section className={s.hero}>
        <div className={`wrap ${s.heroGrid}`}>
          <div>
            <p className={s.kicker}>A revolutionary way to hire</p>
            <h1>
              We cracked the code.{" "}
              <span className={s.gold}>{n ? `${n} qualified candidates, ready when you are.` : "Qualified candidates, ready when you are."}</span>
            </h1>
            <p className={s.wink}>Yes, you&rsquo;re hearing right.</p>
            <p className={s.lede}>
              Every one has had their natural work strengths and experience assessed. They know exactly what they bring to a company,
              and we know exactly where they&rsquo;d fit.
            </p>
            <p className={s.best}>
              <b>The best part:</b> our team has already vetted them. Tell us who you&rsquo;re looking for, and you could be talking to the
              right candidate within half an hour.
            </p>
            <Cta light />
          </div>
          <div className={s.familiar}>
            <div className={s.stats}>
              <div>
                <strong>{n ?? "✓"}</strong>
                <span>qualified candidates ready now</span>
              </div>
              <div>
                <strong>30 min</strong>
                <span>from reaching out to your first conversation</span>
              </div>
              <div>
                <strong>$5,000</strong>
                <span>one flat fee, only when you hire</span>
              </div>
            </div>
            <Link className={`btn btn-gold ${s.cardBtn}`} href="/meet">
              Tell us who you need
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
          <h2>Easier. More accurate. More efficient.</h2>
          <p className={s.doubtBody}>
            That&rsquo;s hiring when the candidates are already known. Tell us about your position, and we&rsquo;ll introduce you to the
            people who fit it.
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
          <h2>Reach out. Let&rsquo;s find your next hire.</h2>
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
