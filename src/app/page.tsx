import { WorksBest } from "@/components/CandidateCard";
import { keepCandidatesOut } from "@/lib/candidateMode";
import { allListed } from "@/lib/catalog";
import Link from "next/link";
import s from "./speech.module.css";

export const dynamic = "force-dynamic";

function Cta({ dark, label = "Talk to our team" }: { dark?: boolean; label?: string }) {
  return (
    <div className={s.cta}>
      <Link className={`btn btn-gold ${s.ctaBtn}`} href="/meet">
        {label}
      </Link>
      <span className={dark ? s.noteDark : s.note}>A short video call, at a time that works for you</span>
    </div>
  );
}

// The front page reads like a short talk to a room of business owners:
// the hook, what we kept hearing, what we believe, what we built, who's here
// right now, the fee, and an invitation. One idea per screen. The goal is
// curiosity: enough to want to talk to our team.
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
    .slice(0, 3);

  return (
    <>
      {/* 1. The hook */}
      <section className={s.hook}>
        <div className={`wrap ${s.narrow}`}>
          <p className={s.kicker}>A revolutionary way to hire</p>
          <h1>We cracked the code.</h1>
          <p className={s.hookGold}>Hiring doesn&rsquo;t have to be a headache.</p>
          <p className={s.wink}>Yes, you&rsquo;re hearing right.</p>
          <a href="#heard" className={s.down}>
            Here&rsquo;s what we figured out <span aria-hidden>↓</span>
          </a>
        </div>
      </section>

      {/* 2. What we kept hearing */}
      <section id="heard" className={s.heard}>
        <div className={`wrap ${s.narrow}`}>
          <p className={s.label}>It started with a conversation</p>
          <p className={s.say}>Business owners and HR people kept coming back to the same thought:</p>
          <blockquote className={s.quote}>&ldquo;Hiring is a headache.&rdquo;</blockquote>
          <p className={s.say}>So we asked what it would take to make hiring work, for everyone.</p>
        </div>
      </section>

      {/* 3. What we believe */}
      <section className={s.believe}>
        <div className="wrap">
          <h2 className={s.center}>It comes down to two things.</h2>
          <div className={s.pair}>
            <div className={s.belief}>
              <span className={s.who}>Business owners</span>
              <p>deserve to choose for themselves.</p>
              <small>No pressure, and a fair, simple fee.</small>
            </div>
            <div className={s.belief}>
              <span className={s.who}>Candidates</span>
              <p>deserve to be treated with respect.</p>
              <small>Known for what they do best, not just a résumé.</small>
            </div>
          </div>
          <p className={s.wins}>When both happen, everyone wins.</p>
        </div>
      </section>

      {/* 4. What we built */}
      <section className={s.built}>
        <div className="wrap">
          <p className={s.labelDark}>So we built</p>
          <h2>The Candidate Collection.</h2>
          <p className={s.simple}>The idea is simple.</p>
          <ol className={s.steps}>
            <li>
              <span>1</span>
              <b>We sit with candidates.</b>
              <p>Every one. We get to know them, their experience and what they&rsquo;re looking for.</p>
            </li>
            <li>
              <span>2</span>
              <b>We find what they&rsquo;re really good at.</b>
              <p>Including a career strengths assessment, so they know the value they bring, and so do we.</p>
            </li>
            <li>
              <span>3</span>
              <b>We introduce them to you.</b>
              <p>The people we think fit your work. A few great options, not a pile of résumés.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* 5. Who's here right now */}
      <section className={s.now}>
        <div className="wrap">
          <p className={s.label}>Right now</p>
          <h2>{n ? `${n} candidates are ready for their next role.` : "Candidates are ready for their next role."}</h2>
          <p className={s.nowSub}>A few of them:</p>
          <div className={s.people}>
            {sample.map((c) => (
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

      {/* 6. The fee */}
      <section className={s.fee}>
        <div className={`wrap ${s.feeRow}`}>
          <p>
            <b>One flat fee of $5,000, paid the day you hire.</b> Never a percentage of salary, and nothing at all if you don&rsquo;t
            hire.
          </p>
          <Link href="/billing">Our billing philosophy →</Link>
        </div>
      </section>

      {/* 7. The invitation */}
      <section className={s.invite}>
        <div className={`wrap ${s.narrow}`}>
          <h2>Curious? Let&rsquo;s talk.</h2>
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
