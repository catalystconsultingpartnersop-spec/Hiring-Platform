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
            Need help?
            <br />
            <span>Just browse.</span>
          </h1>
          <p className={styles.lede}>
            Scroll through people who are ready to work, every one already interviewed by our team. No recruiter. No
            hour-long intake call. No one telling you how to run your business.
          </p>

          <form action="/candidates" className={styles.search} role="search">
            <label className="sr-only" htmlFor="home-q">
              What kind of help do you need?
            </label>
            <input id="home-q" name="q" placeholder="What do you need? Try “bookkeeper” or “someone to run my office”" />
            <button type="submit" className="btn btn-gold">
              Browse
            </button>
          </form>

          <div className={styles.chips}>
            {chips.map(({ role, n }) => (
              <Link key={role} href={n ? `/candidates?role=${encodeURIComponent(role)}` : `/candidates?q=${encodeURIComponent(role)}`}>
                {role}
                {n > 0 && <b>{n}</b>}
              </Link>
            ))}
          </div>

          <p className={styles.free}>Free to browse. Free to see who they are. One flat fee, only if you hire.</p>
        </div>
      </section>

      {feed.length > 0 && (
        <section className={styles.feed}>
          <div className="wrap">
            <div className={styles.feedHead}>
              <h2>{fresh.length ? "Fresh this week, and more" : "People ready to work"}</h2>
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

      <section className={styles.contrast}>
        <div className="wrap">
          <h2>Remember the last time you called a recruiter?</h2>
          <div className={styles.vs}>
            <div className={styles.old}>
              <p className={styles.vsLabel}>The usual way</p>
              <ul>
                <li>An hour-long intake call before you see anyone</li>
                <li>Opinions about how you should run your business</li>
                <li>Homework, forms, and more calls</li>
                <li>A few so-so candidates who don&rsquo;t really fit</li>
                <li>20&ndash;25% of their first-year salary</li>
              </ul>
            </div>
            <div className={styles.new}>
              <p className={styles.vsLabel}>Here</p>
              <ul>
                <li>Open the site and start scrolling, right now</li>
                <li>We don&rsquo;t tell you how to run your business</li>
                <li>No calls, no forms, no homework</li>
                <li>Every person interviewed, with how they work best spelled out</li>
                <li>One flat fee, usually $5,000, only if you hire</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.scroll}>
        <div className={`wrap ${styles.scrollGrid}`}>
          <div>
            <h2>Candidate scrolling.</h2>
            <p>
              Like browsing houses you&rsquo;re not buying yet. Lying in bed at night, thinking about the business,
              and it hits you: <em>&ldquo;I could really use a graphics person.&rdquo;</em> Open the site and look. No
              commitment, nobody calls you in the morning.
            </p>
            <p>When someone catches your eye, save them. When you&rsquo;re ready, meet them.</p>
          </div>
          <ol className={styles.steps}>
            <li>
              <strong>Scroll</strong>
              <span>See what each person is great at, what they&rsquo;ve done and what they want next.</span>
            </li>
            <li>
              <strong>Meet them, free</strong>
              <span>See their name, resume and number in a minute. Card on file, nothing charged.</span>
            </li>
            <li>
              <strong>Hire with one click</strong>
              <span>One flat fee. You get a receipt and a ready-to-fill offer letter.</span>
            </li>
          </ol>
        </div>
      </section>

      <section className={styles.closing}>
        <div className="wrap">
          <h2>Your next hire is a scroll away.</h2>
          <Link className="btn btn-gold" href="/candidates">
            Start browsing
          </Link>
          <p>
            Rather talk to a person? Text or call <a href={`sms:${contactPhoneHref()}`}>{contactPhone()}</a>.
          </p>
          <p className={styles.seeker}>
            Looking for work yourself? <Link href="/apply">Start here</Link>
          </p>
        </div>
      </section>
    </>
  );
}
