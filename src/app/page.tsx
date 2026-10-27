import Link from "next/link";
import { CandidateCard } from "@/components/CandidateCard";
import { getTiers, listListed } from "@/lib/catalog";
import type { FeeTier, PublicCandidate } from "@/lib/db";
import { feeFor } from "@/lib/format";
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
            <h1>Browse the people you&rsquo;ve been wishing you could hire.</h1>
            <p>
              Every candidate here has been coached and assessed, so you know how they&rsquo;re wired before you
              meet them. Sign to see who they are. Pay one flat fee when you decide to hire.
            </p>
            <div className={styles.actions}>
              <Link className="btn btn-gold" href="/candidates">
                Browse candidates
              </Link>
              <Link className="btn btn-ghost" href="/apply">
                I&rsquo;m looking for work
              </Link>
            </div>
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

      <section className="section">
        <div className="wrap">
          <h2 className={styles.h2}>How it works</h2>
          <ol className={styles.steps}>
            <li>
              <h3>Browse</h3>
              <p>
                Each profile describes how the person works best, what they&rsquo;ve done, and what they want next.
                Names stay hidden.
              </p>
            </li>
            <li>
              <h3>Sign to see who they are</h3>
              <p>A short agreement unlocks their name, resume and contact details. Nothing to pay yet.</p>
            </li>
            <li>
              <h3>Pay when you decide to hire</h3>
              <p>
                One flat fee, paid before the hire is confirmed. If the hire doesn&rsquo;t go through, it&rsquo;s
                refunded.
              </p>
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
    </>
  );
}
