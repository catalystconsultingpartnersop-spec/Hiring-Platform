import { WorksBest } from "@/components/CandidateCard";
import { CallbackForm } from "./CallbackForm";
import { keepCandidatesOut } from "@/lib/candidateMode";
import { allListed } from "@/lib/catalog";
import Link from "next/link";
import s from "./home.module.css";

export const dynamic = "force-dynamic";

// The front door for a business owner with a seat to fill. In order, they should:
// get what this is in five seconds (the top), feel understood (every route starts
// its search the day you call, so you wait; said with no blame),
// see what's different (we start with the people), see it's real (people here
// now), know what happens next (three steps), and be invited. One ask throughout.
export default async function Home() {
  await keepCandidatesOut();
  const { rows } = await allListed();
  // The real number ready right now, never a made-up one.
  const n = rows.length >= 10 ? rows.length : null;
  // A few real people from the collection, newest first, one per kind of role.
  const seen = new Set<string>();
  const sample = [...rows]
    .filter((c) => c.headline)
    .sort((a, b) => (b.listed_at ?? "").localeCompare(a.listed_at ?? ""))
    .filter((c) => {
      const k = c.role_category ?? c.id;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 4);
  const rest = sample.slice(0, 3);

  return (
    <>
      <section className={s.hero}>
        <div className={`wrap ${s.heroGrid}`}>
          <div>
            <p className={s.eyebrow}>A revolutionary way to hire</p>
            <h1>
              Looking to hire? <span>We have qualified candidates, vetted and ready to roll.</span>
            </h1>
            <p className={s.wink}>We&rsquo;re not starting a search now. We already met them.</p>
            <p className={s.lede}>
              They&rsquo;re ready, willing and able. Tell us what you need, and{" "}
              <b>half an hour later you can have a qualified candidate to consider.</b>
            </p>
            <a href="#callback" className={`btn btn-gold ${s.ctaBtn} ${s.onlyPhone}`}>
              Talk to our team
            </a>
            <p className={s.links}>
              <a href="#now" className={s.second}>
                See who&rsquo;s here <span aria-hidden>↓</span>
              </a>
              <Link href="/meet" className={s.second}>
                Or pick a time for a video call
              </Link>
            </p>
          </div>
          <div id="callback" className={s.cb}>
            <span className={s.tagOne}>Ready, willing and able</span>
            <h2>Tell us what you need. We&rsquo;ll give you a good match.</h2>
            <CallbackForm />
          </div>
        </div>
        <div className={`wrap ${s.strip}`}>
          <span>
            <b>{n ?? "Real"}</b> candidates ready now
          </span>
          <span>
            <b>Every one</b> met by our team
          </span>
          <span>
            <b>Strengths</b> assessed
          </span>
          <span>
            <b>One flat fee,</b> paid the day you hire
          </span>
        </div>
      </section>

      <section className={s.plan}>
        <div className="wrap">
          <p className={s.label}>How it works</p>
          <h2>Three steps. You stay in charge.</h2>
          <ol className={s.steps}>
            <li>
              <span>1</span>
              <b>Tell us what you need</b>
              <p>Leave your number and we call you back, or pick a time for a short video call.</p>
            </li>
            <li>
              <span>2</span>
              <b>Meet relevant candidates</b>
              <p>A few people we know who fit your position, not a pile of résumés.</p>
            </li>
            <li>
              <span>3</span>
              <b>You choose</b>
              <p>Interview them, take your time, hire who you like.</p>
            </li>
          </ol>
          <p className={s.fee}>
            <b>One flat fee of $5,000, paid the day you hire.</b> Never a percentage of salary, and nothing at all if you don&rsquo;t hire.{" "}
            <Link href="/billing">Our billing philosophy →</Link>
          </p>
          <p className={s.more}>
            <Link href="/how-it-works">How it works, and the questions owners ask →</Link>
          </p>
        </div>
      </section>

      <section className={s.feel}>
        <div className="wrap">
          <p className={s.label}>Sound familiar?</p>
          <h2>Usually, the search starts the day you need someone.</h2>
          <div className={s.ways}>
            <div>
              <div className={s.pile} aria-hidden>
                {Array.from({ length: 14 }, (_, i) => (
                  <i key={i} />
                ))}
              </div>
              <b>You put an ad in a publication.</b>
              <p>Then you wait for résumés.</p>
            </div>
            <div>
              <div className={`${s.pile} ${s.bubbles}`} aria-hidden>
                {Array.from({ length: 7 }, (_, i) => (
                  <i key={i} />
                ))}
              </div>
              <b>You posted on your status.</b>
              <p>Then you wait for names.</p>
            </div>
            <div>
              <div className={`${s.pile} ${s.cardsPile}`} aria-hidden>
                {Array.from({ length: 6 }, (_, i) => (
                  <i key={i} />
                ))}
              </div>
              <b>You called a recruiter.</b>
              <p>&ldquo;We&rsquo;ll open the position and start looking.&rdquo;</p>
            </div>
          </div>
          <p className={s.insight}>
            Every route starts from zero. <b>So you wait, while the position sits open.</b>
          </p>
        </div>
      </section>

      <section className={s.flip}>
        <div className={`wrap ${s.flipGrid}`}>
          <div>
            <p className={s.labelGold}>What we cracked</p>
            <h2>
              <span>Ours is already done.</span>
            </h2>
            <p className={s.wink}>Yes, you&rsquo;re hearing right.</p>
            <p className={s.flipBody}>
              Long before you call, we&rsquo;ve sat down with each candidate, assessed their natural strengths, and understood the kind of
              work they&rsquo;ll thrive in.
            </p>
            <p className={s.flipBody}>
              So when you tell us what you need, we&rsquo;re not starting now. They&rsquo;re ready, willing and able.{" "}
              <b>Half an hour later, you can have a qualified candidate to consider.</b>
            </p>
          </div>
          <div className={s.sift} aria-hidden>
            <div className={s.many}>
              {Array.from({ length: 24 }, (_, i) => (
                <i key={i} />
              ))}
            </div>
            <span className={s.arrow}>→</span>
            <div className={s.few}>
              <i />
              <i />
              <i />
              <small>A few people we know</small>
            </div>
          </div>
        </div>
      </section>

      <section id="now" className={s.now}>
        <div className="wrap">
          <p className={s.label}>See for yourself</p>
          <h2>Meet a few of them.</h2>
          <div className={s.people}>
            {rest.map((c) => (
              <Link key={c.id} href={`/candidates/${c.id}`} className={s.person}>
                {c.role_category && <span className={s.role}>{c.role_category}</span>}
                <p className={s.headline}>{c.headline}</p>
                <WorksBest c={c} compact />
                <span className={s.look}>Take a look →</span>
              </Link>
            ))}
          </div>
          <p className={s.all}>
            <Link href="/candidates">Browse them all</Link>
          </p>
        </div>
      </section>

      <section className={s.invite}>
        <div className="wrap">
          <h2>Looking to hire? Talk to our team.</h2>
          <p>Tell us what you need, and we&rsquo;ll give you a good match.</p>
          <a className={`btn btn-gold ${s.ctaBtn}`} href="#callback">
            Talk to our team
          </a>
          <p className={s.noteDark} style={{ marginTop: 12 }}>
            Or <Link href="/meet" style={{ color: "#fff" }}>pick a time for a video call</Link>
          </p>
          <p className={s.alt}>
            Looking for work yourself? <Link href="/join">Start here</Link>
          </p>
        </div>
      </section>
    </>
  );
}
