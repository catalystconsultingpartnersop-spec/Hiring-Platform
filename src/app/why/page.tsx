import type { Metadata } from "next";
import Link from "next/link";
import { brandName } from "@/lib/format";
import styles from "./why.module.css";

export const metadata: Metadata = {
  title: `Why we started | ${brandName()}`,
  description: "Built by business owners, for business owners. Browse candidates who were met and coached, and pick the person who fits.",
};

// Our story and mission, told from the business owner's side.
export default function WhyPage() {
  return (
    <>
      <section className={styles.hero}>
        <div className="wrap">
          <p className={styles.label}>Why we started</p>
          <h1>Built by business owners, for business owners.</h1>
          <p className={styles.lead}>We&rsquo;re business owners. When it came time to hire, we looked at our options and were unimpressed, and honestly, a little sad.</p>
        </div>
      </section>

      <article className={`wrap ${styles.body}`}>
        <p>Every time we needed to hire, it went the same way.</p>
        <ul className={styles.favors}>
          <li>
            Before we met a single candidate, we were on <b>calls</b>, in <b>meetings</b>, answering <b>questions</b> and filling
            out <b>checklists</b>.
          </li>
          <li>
            We were <b>told how to run the businesses</b> we&rsquo;d spent years building, by people who had known us for an
            hour.
          </li>
          <li>
            Then came <b>the fee</b>. And after all that, <b>30 to 60 days of wondering</b> whether we had hired the right person.
          </li>
        </ul>
        <p className={styles.punch}>By the time we met a single candidate, we&rsquo;d been interviewed more than they had.</p>
        <p>
          <strong>We were the ones being vetted. The candidates came second.</strong>
        </p>
        <p>
          We know our businesses. We know what we need and who we need.{" "}
          <strong>We just wanted good people, and the freedom to choose.</strong>
        </p>

        <section className={styles.how}>
          <h2>So we built the way we wanted to hire.</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <strong>You browse.</strong>
              <span>Every candidate has been met and coached by one of us. You see their strengths, experience and pay range up front.</span>
            </div>
            <div className={styles.step}>
              <strong>You choose.</strong>
              <span>Nobody tells you who to hire or why. It&rsquo;s your business.</span>
            </div>
            <div className={styles.step}>
              <strong>You meet.</strong>
              <span>Sign once to see who they are, then talk to them directly.</span>
            </div>
            <div className={styles.step}>
              <strong>You pay only if you hire.</strong>
              <span>One flat fee. Nothing up front.</span>
            </div>
          </div>
        </section>

        <section className={styles.works}>
          <h2>Why it works</h2>
          <p>
            Our candidates have been coached to understand where they shine and what role they belong in. When someone who knows
            what they&rsquo;re looking for meets an owner who knows what they need, that&rsquo;s a setup for success.
          </p>
        </section>
      </article>

      <section className={styles.closing}>
        <div className="wrap">
          <h2>It&rsquo;s your business. Pick your people.</h2>
          <p>Free to browse. One flat fee, only if you hire.</p>
          <div className={styles.actions}>
            <Link className="btn btn-gold" href="/candidates">
              Browse candidates
            </Link>
            <Link className={`btn btn-ghost ${styles.light}`} href="/mission">
              Our mission for candidates
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
