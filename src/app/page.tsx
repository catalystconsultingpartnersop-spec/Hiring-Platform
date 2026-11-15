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
  // The kinds of positions we have people for right now, most people first.
  const tally = new Map<string, number>();
  for (const c of rows) if (c.role_category) tally.set(c.role_category, (tally.get(c.role_category) ?? 0) + 1);
  const roles = [...tally.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).map(([r]) => r).slice(0, 10);

  return (
    <>
      <section className={s.hero}>
        <div className={`wrap ${s.heroGrid}`}>
          <div>
            <p className={s.eyebrow}>A revolutionary way to hire</p>
            <h1>
              Looking to hire? <span>We already met your next candidate.</span>
            </h1>
            <p className={s.wink}>Qualified. Vetted. Ready to roll.</p>
            <p className={s.lede}>
              Tell us what you need. <b>Half an hour later, you can have a candidate to consider.</b>
            </p>
            <a href="#callback" className={`btn btn-gold ${s.ctaBtn} ${s.onlyPhone}`}>
              Talk to our team
            </a>
            <p className={s.links}>
              <Link href="/candidates" className={s.second}>
                Or browse candidates yourself <span aria-hidden>→</span>
              </Link>
            </p>
          </div>
          <div id="callback" className={s.cb}>
            <h2>Tell us what you need.</h2>
            <CallbackForm />
            <p className={s.cbAlt}>
              Or <Link href="/meet">pick a time for a video call</Link>
            </p>
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
            <b>One flat fee</b>
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

      <section id="now" className={s.now}>
        <div className="wrap">
          <p className={s.label}>See for yourself</p>
          <h2>Meet a few of them.</h2>
          <p className={s.nowLede}>Long before you call, we&rsquo;ve sat down with each one. Have a look around, no sign-up needed.</p>
          {roles.length > 1 && (
            <div className={s.chips}>
              <span>We have people for</span>
              {roles.map((r) => (
                <Link key={r} href={`/candidates?role=${encodeURIComponent(r)}`}>
                  {r}
                </Link>
              ))}
              <Link href="/candidates" className={s.chipMore}>
                and more →
              </Link>
            </div>
          )}
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
            <Link href="/candidates" className="btn btn-gold">
              Browse them all →
            </Link>
          </p>
        </div>
      </section>

      <section className={s.why}>
        <div className="wrap">
          <p className={s.labelGold}>Built around you</p>
          <h2>
            Usually, the search starts the day you need someone. <span>Ours is already done.</span>
          </h2>
          <div className={s.boxes}>
            <div>
              <b>Talk to us, or browse</b>
              <p>Tell us the position and we&rsquo;ll call you. Or look through the collection on your own.</p>
            </div>
            <div>
              <b>Your business, your call</b>
              <p>You know your business best. We bring the people. You decide.</p>
            </div>
            <div>
              <b>Everyone met one-on-one</b>
              <p>We sat down with each candidate and learned the kind of work they&rsquo;ll thrive in.</p>
            </div>
            <div>
              <b>Half an hour</b>
              <p>Tell us what you need, and half an hour later you can have a qualified candidate to consider.</p>
            </div>
            <div>
              <b>One flat fee</b>
              <p>$5,000, paid the day you hire. Never a percentage of salary.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={s.team}>
        <div className="wrap">
          <p className={s.label}>Who we are</p>
          <h2>A team with a knack for people.</h2>
          <p className={s.teamBody}>
            Recruiters, consultants, HR specialists and executives. Successful people in our own fields, on one team because we share one
            mission: helping people find the work that truly fits them.
          </p>
          <p className={s.teamBody}>Together, we&rsquo;ve sat down with every person in the collection.</p>
          <p className={s.more}>
            <Link href="/meet">Meet the team →</Link>
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
