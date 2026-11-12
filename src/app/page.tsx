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
// get what this is in five seconds (the top), feel understood (no obvious place
// to turn, and no confidence the candidates will be relevant to them),
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
            <p className={s.kicker}>For business owners with a position to fill</p>
            <h1>
              We cracked the code. <span>When you need to hire, now you know where to turn.</span>
            </h1>
            <p className={s.wink}>Yes, you&rsquo;re hearing right.</p>
            <p className={s.lede}>
              We&rsquo;ve sat down with {n ? <b>{n} candidates</b> : "candidates"} and learned what each one is truly great at. So the people
              you meet here are relevant to your position. Tell us who you need.
            </p>
            <Cta dark />
          </div>
          {top && (
            <div className={s.stack}>
              <span className={s.badge}>{n ? `1 of ${n} ready now` : "Ready now"}</span>
              <Link href={`/candidates/${top.id}`} className={s.heroCard}>
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
      </section>

      <section className={s.feel}>
        <div className="wrap">
          <p className={s.label}>You know the feeling</p>
          <h2>You need to hire. Where do you turn?</h2>
          <div className={s.thoughts}>
            <p>&ldquo;I need someone. Where do I even start?&rdquo;</p>
            <p>&ldquo;Who do I ask?&rdquo;</p>
            <p>&ldquo;Will the candidates I get even be relevant to me?&rdquo;</p>
          </div>
          <p className={s.insight}>
            It&rsquo;s not you. <b>There hasn&rsquo;t been an obvious place to turn,</b> or a way to know that the candidates you&rsquo;ll get
            fit your position.
          </p>
        </div>
      </section>

      <section className={s.flip}>
        <div className={`wrap ${s.flipGrid}`}>
          <div>
            <p className={s.labelGold}>What we figured out</p>
            <h2>
              Hiring usually starts with the opening. <span>We start with the people.</span>
            </h2>
          </div>
          <div>
            <p className={s.flipBody}>
              Long before you call, we&rsquo;ve already sat with each candidate, assessed their natural strengths, and understood the kind
              of work they&rsquo;ll thrive in.
            </p>
            <p className={s.flipBody}>
              So when you tell us about your position, <b>we already know who&rsquo;s relevant to you.</b>
            </p>
          </div>
        </div>
      </section>

      <section className={s.now}>
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
        </div>
      </section>

      <section className={s.invite}>
        <div className="wrap">
          <h2>Need to hire? Now you know where to turn.</h2>
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
