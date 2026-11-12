import { WorksBest } from "@/components/CandidateCard";
import { CallbackForm } from "./CallbackForm";
import { keepCandidatesOut } from "@/lib/candidateMode";
import { allListed } from "@/lib/catalog";
import Link from "next/link";
import s from "./home.module.css";

export const dynamic = "force-dynamic";

// The front door for a business owner looking to hire. In the order it's seen:
// 1. the first screen (the whole message, and the one ask), 2. the three steps,
// 3. why it's different (the search is done before you call), 4. who the
// candidates are, 5. the invitation. One ask throughout: speak with our team.
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
              Unimpressed with your hiring options? <span>We built a better one.</span>
            </h1>
            <ul className={s.points}>
              <li>
                <b>Already met.</b> Our trained career coaches sit down with every candidate.
              </li>
              <li>
                <b>Already looking.</b> Our candidates want a new opportunity now. We don&rsquo;t start hunting when you call.
              </li>
              <li>
                <b>Half an hour.</b> If one matches your position, your first interview can be less than half an hour after your first
                call with us.
              </li>
            </ul>
            <a href="#callback" className={`btn btn-gold ${s.ctaBtn} ${s.onlyPhone}`}>
              Speak with our team
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
            <span className={s.tagOne}>Looking to hire?</span>
            <h2>Speak with a business professional on our team.</h2>
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
              <b>Tell us the position</b>
              <p>Leave your number and a business professional on our team calls you back.</p>
            </li>
            <li>
              <span>2</span>
              <b>Meet a match</b>
              <p>If a candidate matches, your first interview can be less than half an hour after that call.</p>
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

      <section className={s.flip}>
        <div className="wrap">
          <p className={s.labelGold}>Why it&rsquo;s revolutionary</p>
          <h2>
            <span>The search is done before you call.</span>
          </h2>
          <div className={s.versus}>
            <div className={s.usually}>
              <small>Usually</small>
              <ol>
                <li>You say you&rsquo;re hiring.</li>
                <li>The position gets opened.</li>
                <li>The hunt begins.</li>
                <li>You wait.</li>
              </ol>
            </div>
            <div className={s.here}>
              <small>Here</small>
              <ol>
                <li>Our candidates are already looking for a new opportunity.</li>
                <li>Our career coaches have already sat down with each one.</li>
                <li>You tell us the position.</li>
                <li>
                  <b>A match? Your first interview can be within half an hour.</b>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section id="now" className={s.now}>
        <div className={`wrap ${s.nowGrid}`}>
          <div>
            <p className={s.label}>Our candidates</p>
            <h2>Each one sat down with a career coach.</h2>
            <p className={s.coach}>
              Our team of trained career coaches sits with every candidate and aligns them with the work where they provide the most value,
              based on their strengths and past experience.
            </p>
            <p className={s.all}>
              <Link href="/candidates">Browse them all →</Link>
            </p>
          </div>
          <div className={s.people}>
            {rest.map((c) => (
              <Link key={c.id} href={`/candidates/${c.id}`} className={s.person}>
                {c.role_category && <span className={s.role}>{c.role_category}</span>}
                <p className={s.headline}>{c.headline}</p>
                <WorksBest c={c} compact />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={s.invite}>
        <div className="wrap">
          <h2>Looking to hire?</h2>
          <p>Speak with a business professional on our team.</p>
          <a className={`btn btn-gold ${s.ctaBtn}`} href="#callback">
            Speak with our team
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
