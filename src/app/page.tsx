import Link from "next/link";
import { CandidateCard } from "@/components/CandidateCard";
import { getTiers, listListed } from "@/lib/catalog";
import type { FeeTier, PublicCandidate } from "@/lib/db";
import { contactPhone, contactPhoneHref, feeFor } from "@/lib/format";
import styles from "./home.module.css";

export const dynamic = "force-dynamic";

const EXAMPLE: PublicCandidate = {
  id: "00000000-0000-0000-0000-000000000000",
  status: "listed",
  headline: "Field sales closer who thrives on job sites, not in an office",
  role_category: "Sales",
  industry: "Construction",
  level: "experienced",
  location_region: "Northern New Jersey",
  work_mode: "on-site",
  salary_min: 85000,
  salary_max: 100000,
  strengths: ["rallying people", "reading a room", "pushing a deal over the line"],
  working_genius: "Galvanizing, Enablement",
  summary: null,
  highlights: [],
  fee_override_cents: 500000,
  listed_at: null,
};

export default async function Home() {
  let featured: PublicCandidate[] = [];
  let tiers: FeeTier[] = [];
  try {
    [featured, tiers] = await Promise.all([listListed(), getTiers()]);
  } catch {
    // Database not connected yet: show the example card.
  }
  const hero = featured[0];
  const pick = (test: (c: PublicCandidate) => boolean) => featured.filter(test).slice(0, 8);
  const aisles = [
    { title: "Salespeople", href: "/candidates?role=Sales", items: pick((c) => c.role_category === "Sales") },
    {
      title: "Numbers people",
      href: "/candidates?strength=D",
      items: pick((c) => ["Bookkeeping", "Accounting"].includes(c.role_category ?? "")),
    },
    {
      title: "People who keep everything running",
      href: "/candidates?strength=T",
      items: pick((c) => ["Executive assistant", "Office manager", "Operations", "Project management"].includes(c.role_category ?? "")),
    },
    { title: "Beginners with potential", href: "/candidates?level=beginner", items: pick((c) => c.level === "beginner") },
  ];

  return (
    <>
      <section className={styles.hero}>
        <div className={`wrap ${styles.heroGrid}`}>
          <div className={styles.heroText}>
            <p className={styles.pill}>Every candidate interviewed by a real person</p>
            <h1>Hire someone you&rsquo;ll be glad you hired.</h1>
            <p>
              We talk to every candidate, coach them and learn how they work best, so you can meet people who actually
              fit. Browsing and meeting them is free. You pay one flat fee, only if you hire.
            </p>
            <div className={styles.actions}>
              <Link className="btn btn-gold" href="/candidates">
                Browse candidates
              </Link>
              <Link className="btn btn-ghost" href="/login?mode=create&next=/candidates">
                Create a free account
              </Link>
            </div>
            <p className={styles.talk}>
              Rather talk first? Text or call <a href={`sms:${contactPhoneHref()}`}>{contactPhone()}</a>. A real person
              answers.
            </p>
          </div>
          <div className={styles.heroCard}>
            {hero ? (
              <CandidateCard c={hero} fee={feeFor(hero, tiers)} href={`/candidates/${hero.id}`} />
            ) : (
              <CandidateCard c={EXAMPLE} fee={EXAMPLE.fee_override_cents} example />
            )}
          </div>
        </div>
      </section>

      <div className={styles.trust}>
        <ul className="wrap">
          <li>Free to browse</li>
          <li>Free to see who they are</li>
          <li>One flat fee, only if you hire</li>
          <li>No percentage of salary</li>
        </ul>
      </div>

      <section className="section">
        <div className="wrap">
          <h2 className={styles.h2}>We&rsquo;re on your side, too.</h2>
          <p className={styles.sub}>
            Hiring is personal. A wrong hire costs you time, money and sleep. Here&rsquo;s how we look out for you.
          </p>
          <div className={styles.care}>
            <div>
              <h3>We meet every candidate first</h3>
              <p>
                Before anyone is listed, someone on our team has spoken with them, coached them and learned how they
                work best. You see that up front, in plain words.
              </p>
            </div>
            <div>
              <h3>No pressure, ever</h3>
              <p>
                Nobody calls you to push a candidate. Browse at your own pace, meet as many people as you like, and
                decide when you&rsquo;re ready.
              </p>
            </div>
            <div>
              <h3>Help when you want it</h3>
              <p>
                Free offer letters, paperwork templates and practical hiring advice come with your account. And a real
                person is a text away.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={`section ${styles.howBand}`}>
        <div className="wrap">
          <h2 className={styles.h2}>How it works</h2>
          <ol className={styles.steps}>
            <li>
              <h3>Browse</h3>
              <p>
                Each profile shows how the person works best, what they&rsquo;ve done and what they want next. Like
                shopping, but for your next great hire.
              </p>
            </li>
            <li>
              <h3>Meet them, free</h3>
              <p>
                Agree to simple terms and keep a card on file, and you&rsquo;ll see their name, resume and contact
                details right away. Nothing is charged.
              </p>
            </li>
            <li>
              <h3>Hire with one click</h3>
              <p>One flat fee, only when you decide to hire. You get a receipt and a ready-to-fill offer letter.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className={`section ${styles.diff}`}>
        <div className={`wrap ${styles.diffGrid}`}>
          <h2 className={styles.h2}>Not a recruiter.</h2>
          <dl className={styles.diffList}>
            <div>
              <dt>A flat fee, not a percentage</dt>
              <dd>Typically $5,000 for a $100,000 role, instead of 20–25% of first-year salary.</dd>
            </div>
            <div>
              <dt>You choose</dt>
              <dd>Nobody pushes a candidate on you. You browse, you decide, and the hire is yours.</dd>
            </div>
            <div>
              <dt>Candidates are coached first</dt>
              <dd>We work with people before they&rsquo;re listed, so they know which roles bring out their best.</dd>
            </div>
          </dl>
        </div>
      </section>

      {aisles.map((a) =>
        a.items.length ? (
          <section className={styles.aisle} key={a.title}>
            <div className="wrap">
              <div className={styles.moreHead}>
                <h2 className={styles.h2}>{a.title}</h2>
                <Link href={a.href}>See all</Link>
              </div>
              <div className="shelf">
                {a.items.map((c) => (
                  <CandidateCard key={c.id} c={c} fee={feeFor(c, tiers)} href={`/candidates/${c.id}`} />
                ))}
              </div>
            </div>
          </section>
        ) : null,
      )}

      <section className="section">
        <div className={`wrap ${styles.faqGrid}`}>
          <h2 className={styles.h2}>Questions owners ask</h2>
          <div>
            <details className={styles.faq}>
              <summary>Is it really free to look?</summary>
              <p>
                Yes. Browsing is free, and so is seeing who a candidate is. You only pay if you decide to hire someone.
              </p>
            </details>
            <details className={styles.faq}>
              <summary>What does &ldquo;interviewed&rdquo; mean?</summary>
              <p>
                Someone on our team has spoken with every candidate, coached them and assessed how they work best. We
                don&rsquo;t make promises about any one person: you interview them and make the call. We just make
                sure you&rsquo;re meeting people worth meeting.
              </p>
            </details>
            <details className={styles.faq}>
              <summary>Why do you need a card to see who they are?</summary>
              <p>
                It keeps things serious and fair to candidates, who trust us with their details. Your card is stored
                securely by Stripe and nothing is charged unless you hire.
              </p>
            </details>
            <details className={styles.faq}>
              <summary>What if I meet someone and don&rsquo;t hire them?</summary>
              <p>Then you owe nothing. Meet as many people as you like.</p>
            </details>
            <details className={styles.faq}>
              <summary>How much is the fee?</summary>
              <p>
                It&rsquo;s shown on every profile before you do anything, usually $5,000 for roles up to $100,000. One
                time, no percentage of salary, no subscription.
              </p>
            </details>
          </div>
        </div>
      </section>

      <section className={styles.closing}>
        <div className="wrap">
          <h2>Your next great hire might already be here.</h2>
          <div className={styles.actions} style={{ justifyContent: "center" }}>
            <Link className="btn btn-gold" href="/candidates">
              Browse candidates
            </Link>
            <Link className="btn btn-ghost" href="/apply" style={{ color: "#fff", borderColor: "rgba(255,255,255,.5)" }}>
              I&rsquo;m looking for work
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
