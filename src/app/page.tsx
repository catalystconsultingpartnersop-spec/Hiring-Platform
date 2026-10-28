import Link from "next/link";
import { CandidateCard, isNew } from "@/components/CandidateCard";
import { getTiers, listListed } from "@/lib/catalog";
import type { FeeTier, PublicCandidate } from "@/lib/db";
import { contactPhone, contactPhoneHref, feeFor } from "@/lib/format";
import styles from "./home.module.css";

export const dynamic = "force-dynamic";

// Shown as quick picks even before there's anyone listed in that role.
const POPULAR = ["Office manager", "Bookkeeping", "Sales", "Executive assistant", "Graphic design", "Customer service", "Operations", "Marketing"];

export default async function Home() {
  let all: PublicCandidate[] = [];
  let tiers: FeeTier[] = [];
  try {
    [all, tiers] = await Promise.all([listListed(), getTiers()]);
  } catch {
    // Database not reachable: the page still explains the idea.
  }

  // Roles people can jump straight into, busiest first.
  const counts = new Map<string, number>();
  for (const c of all) if (c.role_category) counts.set(c.role_category, (counts.get(c.role_category) ?? 0) + 1);
  const chips = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([r, n]) => ({ role: r, n }));
  for (const r of POPULAR) if (chips.length < 8 && !counts.has(r)) chips.push({ role: r, n: 0 });

  const fresh = all.filter(isNew);
  const feed = [...fresh, ...all.filter((c) => !isNew(c))].slice(0, 12);
  const card = (c: PublicCandidate) => <CandidateCard key={c.id} c={c} fee={feeFor(c, tiers)} href={`/candidates/${c.id}`} />;

  return (
    <>
      <section className={styles.hero}>
        <div className="wrap">
          <h1>
            Looking for your next employee?
            <br />
            <span>Just browse.</span>
          </h1>
          <p className={styles.lede}>
            Meet people who are ready to work, and excited to. Every one has sat down with our team, so you can see
            what they&rsquo;re great at before you even say hello.
          </p>

          <div className={styles.cta}>
            <Link className="btn btn-gold" href="/candidates">
              Browse candidates
            </Link>
          </div>

          <p className={styles.jump}>Or jump straight to</p>
          <div className={styles.chips}>
            {chips.map(({ role, n }) => (
              <Link key={role} href={n ? `/candidates?role=${encodeURIComponent(role)}` : `/candidates?q=${encodeURIComponent(role)}`}>
                {role}
                {n > 0 && <b>{n}</b>}
              </Link>
            ))}
          </div>

          <p className={styles.free}>Welcome. Take your time, look around, and save the ones you like.</p>
        </div>
      </section>

      {feed.length > 0 && (
        <section className={styles.feed}>
          <div className="wrap">
            <div className={styles.feedHead}>
              <h2>Say hello to a few of them</h2>
              <Link href="/candidates">See everyone ({all.length})</Link>
            </div>
            <div className={styles.grid}>{feed.map(card)}</div>
            <div className={styles.more}>
              <Link className="btn btn-gold" href="/candidates">
                Keep scrolling
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className={styles.made}>
        <div className="wrap">
          <h2>Made for busy owners.</h2>
          <p className={styles.madeSub}>Finding good people should feel like the easy part of your day.</p>
          <div className={styles.tiles}>
            <div>
              <span className={styles.icon} aria-hidden="true">☾</span>
              <h3>Browse anytime</h3>
              <p>Late at night, between jobs, on your phone. The people are here whenever you are.</p>
            </div>
            <div>
              <span className={styles.icon} aria-hidden="true">★</span>
              <h3>Know them before you meet them</h3>
              <p>What each person is great at, what they&rsquo;ve done and what they want next, in plain words.</p>
            </div>
            <div>
              <span className={styles.icon} aria-hidden="true">☎</span>
              <h3>Meet them your way</h3>
              <p>See their name, resume and number in a minute, then reach out directly, on your schedule.</p>
            </div>
            <div>
              <span className={styles.icon} aria-hidden="true">$</span>
              <h3>One simple fee</h3>
              <p>A flat fee, shown up front on every profile, only when you decide to hire.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.scroll}>
        <div className={`wrap ${styles.scrollGrid}`}>
          <div>
            <h2>Candidate scrolling.</h2>
            <p>
              Like browsing homes for fun. You&rsquo;re winding down at night, thinking about the business, and it
              hits you: <em>&ldquo;I could really use a graphics person.&rdquo;</em> So you take a look.
            </p>
            <p>Save the ones you like. When the time is right, meet them.</p>
          </div>
          <ol className={styles.steps}>
            <li>
              <strong>Browse</strong>
              <span>See what each person is great at and what they want next.</span>
            </li>
            <li>
              <strong>Meet them</strong>
              <span>See their name, resume and number in a minute. Nothing is charged.</span>
            </li>
            <li>
              <strong>Welcome them aboard</strong>
              <span>Hire with one click. You get a receipt and a ready-to-fill offer letter.</span>
            </li>
          </ol>
        </div>
      </section>

      <section className={styles.people}>
        <div className={`wrap ${styles.peopleGrid}`}>
          <div className={styles.quoteMark} aria-hidden="true">“</div>
          <div>
            <h2>Every person here, we&rsquo;ve met.</h2>
            <p>
              We sit down with each candidate, learn what makes them tick, and help them find work they&rsquo;ll
              love. So the people you meet here aren&rsquo;t just looking for any job. They&rsquo;re looking for the
              right one, and that might be with you.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.closing}>
        <div className="wrap">
          <h2>We&rsquo;re glad you&rsquo;re here.</h2>
          <p className={styles.closingSub}>Your next great employee might be one scroll away.</p>
          <Link className="btn btn-gold" href="/candidates">
            Start browsing
          </Link>
          <p>
            Want to say hi first? Text or call <a href={`sms:${contactPhoneHref()}`}>{contactPhone()}</a>.
          </p>
          <p className={styles.seeker}>
            Looking for work yourself? <Link href="/apply">Start here</Link>
          </p>
        </div>
      </section>
    </>
  );
}
