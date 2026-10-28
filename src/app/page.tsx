import Link from "next/link";
import { CandidateCard, isNew } from "@/components/CandidateCard";
import { getTiers, listListed } from "@/lib/catalog";
import type { FeeTier, PublicCandidate } from "@/lib/db";
import { contactPhone, contactPhoneHref, feeFor } from "@/lib/format";
import { nowMs } from "@/lib/time";
import styles from "./home.module.css";

export const dynamic = "force-dynamic";

// Shown as quick picks even before there's anyone listed in that role.
const POPULAR = ["Office manager", "Bookkeeping", "Sales", "Executive assistant", "Graphic design", "Customer service", "Operations", "Marketing"];

// Fixed examples for the welcome stack at the top. The real, live
// candidates appear as soon as the owner starts browsing.
const example = (id: string, c: Partial<PublicCandidate>): PublicCandidate => ({
  id,
  status: "listed",
  headline: null,
  role_category: null,
  industry: null,
  level: null,
  location_region: null,
  work_mode: null,
  salary_min: null,
  salary_max: null,
  strengths: [],
  working_genius: null,
  summary: null,
  highlights: [],
  fee_override_cents: null,
  listed_at: null,
  ...c,
});
const SHOWCASE: PublicCandidate[] = [
  example("ex-1", {
    headline: "Bookkeeper who finds the mistake everyone else missed",
    role_category: "Bookkeeping",
    industry: "Small business",
    level: "experienced",
    location_region: "Brooklyn, NY",
    work_mode: "hybrid",
    salary_min: 62000,
    salary_max: 72000,
    working_genius: "DTWEIG",
    fee_override_cents: 500000,
  }),
  example("ex-2", {
    headline: "Executive assistant who runs a CEO's week like a control tower",
    role_category: "Executive assistant",
    industry: "Real estate",
    level: "senior",
    location_region: "Manhattan, NY",
    work_mode: "on-site",
    salary_min: 95000,
    salary_max: 115000,
    working_genius: "ETDGWI",
    fee_override_cents: 1000000,
  }),
  example("ex-3", {
    headline: "Beginner with a head for numbers and a hunger to learn",
    role_category: "Accounting",
    industry: "Small business",
    level: "beginner",
    location_region: "Lakewood, NJ",
    work_mode: "flexible",
    salary_min: 42000,
    salary_max: 50000,
    working_genius: "WDITGE",
    fee_override_cents: 500000,
  }),
];

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
        <div className={`wrap ${styles.heroGrid}`}>
          <div>
            <p className={styles.kicker}>Vetted talent, ready when you are</p>
            <h1 className={styles.big}>Find the one you&rsquo;re looking for.</h1>
            <p className={styles.wink}>Or the one you didn&rsquo;t know you needed.</p>
            <p className={styles.lede}>
              Scroll through our collection of vetted candidates. Look around, take your time, and see the talent
              that&rsquo;s available to you.
            </p>
            <div className={styles.cta}>
              <Link className="btn btn-gold" href="/candidates">
                Start browsing
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
          </div>
          <div className={styles.stack} aria-hidden="true">
            {SHOWCASE.map((c, i) => (
              <div key={c.id} className={styles[`s${i}`]}>
                <CandidateCard c={{ ...c, listed_at: new Date(nowMs()).toISOString() }} fee={c.fee_override_cents} />
              </div>
            ))}
          </div>
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
          <h2>Hiring, the easy way.</h2>
          <p className={styles.easySub}>Everything about this is built around your time.</p>
          <div className={styles.easy}>
            <div>
              <h3>See people right away</h3>
              <p>Open the site and start scrolling. No call to schedule first.</p>
            </div>
            <div>
              <h3>Your business, your call</h3>
              <p>You know your business best. We&rsquo;re here to show you great people, not to give you advice.</p>
            </div>
            <div>
              <h3>Nothing to fill out</h3>
              <p>No forms, no homework, no back-and-forth. Just browse.</p>
            </div>
            <div>
              <h3>People who fit</h3>
              <p>Every person is interviewed, with how they work best spelled out in plain words.</p>
            </div>
            <div>
              <h3>One fair, flat fee</h3>
              <p>Usually $5,000, and only if you hire. Never a percentage of salary.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.mission} id="mission">
        <div className={`wrap ${styles.missionGrid}`}>
          <div>
            <p className={styles.missionLabel}>Our mission</p>
            <h2>Every person has a talent. We help them find where it shines.</h2>
          </div>
          <div className={styles.missionText}>
            <p>
              We treat every candidate with dignity and respect. Before anyone is listed, we sit down with them and talk
              about what they&rsquo;re great at and where their talents are truly valued.
            </p>
            <p>
              So when you browse, you&rsquo;re meeting people who already have that clarity. You both start the
              relationship set up for success.
            </p>
            <p>
              It isn&rsquo;t a guarantee. Plenty has to go right for any hire to work out. But it&rsquo;s a real
              start, and it&rsquo;s a better one.
            </p>
            <p className={styles.missionBottom}>
              Bottom line: we help people discover their natural strengths and character, so they can find work that
              truly fits them. And a person in the right job is the best hire you&rsquo;ll ever make.
            </p>
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
