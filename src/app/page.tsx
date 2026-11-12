import { WorksBest } from "@/components/CandidateCard";
import { keepCandidatesOut } from "@/lib/candidateMode";
import { allListed } from "@/lib/catalog";
import Link from "next/link";
import s from "./home.module.css";

export const dynamic = "force-dynamic";

function Cta({ dark }: { dark?: boolean }) {
  return (
    <div className={s.cta}>
      <Link className={`btn btn-gold ${s.ctaBtn}`} href="/meet">
        Talk to our team
      </Link>
      <span className={dark ? s.noteDark : s.note}>A short video call, at a time that works for you</span>
    </div>
  );
}

// The front door for a business owner with a seat to fill. In order, they should:
// get what this is in five seconds (the top), feel understood (every route brings
// candidates; sorting out who's relevant lands on the owner; said with no blame),
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
  const top = sample[0];
  const rest = sample.slice(1, 4);

  return (
    <>
      <section className={s.hero}>
        <div className={`wrap ${s.heroGrid}`}>
          <div>
            <p className={s.eyebrow}>We cracked the code on hiring</p>
            <h1>
              You don&rsquo;t need more résumés. <span>You need the right person.</span>
            </h1>
            <p className={s.lede}>
              We&rsquo;ve sat down with {n ? <b>{n} candidates</b> : "candidates"} and learned what each one is truly great at. So you
              don&rsquo;t get a pile to sort. You meet the people who fit your position.
            </p>
            <div className={s.ctaRow}>
              <Link className={`btn btn-gold ${s.ctaBtn}`} href="/meet">
                Talk to our team
              </Link>
              <a href="#now" className={s.second}>
                See who&rsquo;s here <span aria-hidden>↓</span>
              </a>
            </div>
            <p className={s.noteDark}>A short video call, at a time that works for you</p>
          </div>
          {top && (
            <div className={s.scene}>
              <div className={s.sheets} aria-hidden>
                {Array.from({ length: 9 }, (_, i) => (
                  <i key={i} />
                ))}
              </div>
              <span className={s.tagPile}>Easy to get: résumés</span>
              <Link href={`/candidates/${top.id}`} className={s.heroCard}>
                <span className={s.tagOne}>Hard to find: the right person</span>
                {top.role_category && <span className={s.role}>{top.role_category}</span>}
                <p className={s.headline}>{top.headline}</p>
                <WorksBest c={top} compact />
                <ul className={s.known}>
                  <li>We sat down with them</li>
                  <li>Strengths assessed</li>
                  <li>We know what they want next</li>
                </ul>
              </Link>
            </div>
          )}
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

      <section className={s.feel}>
        <div className="wrap">
          <p className={s.label}>Sound familiar?</p>
          <h2>Getting résumés was never the hard part.</h2>
          <div className={s.ways}>
            <div>
              <div className={s.pile} aria-hidden>
                {Array.from({ length: 14 }, (_, i) => (
                  <i key={i} />
                ))}
              </div>
              <b>You put an ad in a publication.</b>
              <p>Résumés came in. Plenty of them.</p>
            </div>
            <div>
              <div className={`${s.pile} ${s.bubbles}`} aria-hidden>
                {Array.from({ length: 7 }, (_, i) => (
                  <i key={i} />
                ))}
              </div>
              <b>You posted on your status.</b>
              <p>Good people sent you names.</p>
            </div>
            <div>
              <div className={`${s.pile} ${s.cardsPile}`} aria-hidden>
                {Array.from({ length: 6 }, (_, i) => (
                  <i key={i} />
                ))}
              </div>
              <b>You called a recruiter.</b>
              <p>More résumés to go through.</p>
            </div>
          </div>
          <p className={s.insight}>
            But a résumé isn&rsquo;t a candidate. <b>Finding the one person who&rsquo;s right for your position is the hard part.</b> And
            that part lands on your desk.
          </p>
        </div>
      </section>

      <section className={s.flip}>
        <div className={`wrap ${s.flipGrid}`}>
          <div>
            <p className={s.labelGold}>What we cracked</p>
            <h2>
              <span>That&rsquo;s the part we cracked.</span>
            </h2>
            <p className={s.wink}>Yes, you&rsquo;re hearing right.</p>
            <p className={s.flipBody}>
              Long before you call, we&rsquo;ve sat down with each candidate, assessed their natural strengths, and understood the kind of
              work they&rsquo;ll thrive in.
            </p>
            <p className={s.flipBody}>
              So when you tell us about your position, <b>you meet a few people who fit it.</b>
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
          <h2>{n ? `${n} candidates, ready right now.` : "Candidates, ready right now."}</h2>
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

      <section className={s.plan}>
        <div className="wrap">
          <p className={s.label}>When you reach out</p>
          <h2>Three steps. You stay in charge.</h2>
          <ol className={s.steps}>
            <li>
              <span>1</span>
              <b>Tell us who you need</b>
              <p>A short video call with our team about the role and the kind of person who&rsquo;d thrive in it.</p>
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

      <section className={s.invite}>
        <div className="wrap">
          <h2>Need to hire? Meet the right person.</h2>
          <p>Tell our team what you&rsquo;re looking for. We&rsquo;ll tell you who might fit.</p>
          <Cta dark />
          <p className={s.alt}>
            Looking for work yourself? <Link href="/join">Start here</Link>
          </p>
        </div>
      </section>
    </>
  );
}
