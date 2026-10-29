import type { Metadata } from "next";
import Link from "next/link";
import { brandName } from "@/lib/format";
import styles from "./why.module.css";

export const metadata: Metadata = {
  title: `Why we started | ${brandName()}`,
  description: "We're business owners. We built the hiring experience we always wanted: browse candidates who were met and coached, and choose for yourself.",
};

// The landing page for the owner teaser: our story, what's different, and
// what we won't do, told from the business owner's side.
export default function WhyPage() {
  return (
    <>
      <section className={styles.hero}>
        <div className="wrap">
          <p className={styles.label}>Why we started</p>
          <h1>We built the hiring experience we always wanted.</h1>
          <p className={styles.lead}>
            We&rsquo;re business owners. Every time we hired, we spent more time answering questions than meeting people. So we
            changed the order.
          </p>
        </div>
      </section>

      <article className={`wrap ${styles.body}`}>
        <h2 className={styles.h2}>Hiring was backwards.</h2>
        <p>
          You know the routine. A call to explain what you need. A meeting to explain it again. A checklist, a questionnaire, a
          &ldquo;quick review&rdquo; of how you run things, from someone who met you that morning. Then the fee. Then weeks of
          wondering if you got it right.
        </p>
        <p className={styles.punch}>By the time we met a single candidate, we&rsquo;d been interviewed more than they had.</p>
        <p>
          We know our businesses. We know what we need and who we need. <strong>We wanted good people, and the freedom to
          choose.</strong>
        </p>

        <h2 className={styles.h2}>So we flipped it.</h2>
        <p>The candidate does the work up front. You do the choosing.</p>
        <div className={styles.steps}>
          <div className={styles.step}>
            <strong>We sit with every candidate first.</strong>
            <span>
              A real conversation with one of our reps. They discover their natural strengths and the role they belong in, before
              you ever see them.
            </span>
          </div>
          <div className={styles.step}>
            <strong>You see the fit before the name.</strong>
            <span>Strengths, experience, pay range and what they&rsquo;re looking for, on one page. Browse as long as you like.</span>
          </div>
          <div className={styles.step}>
            <strong>You choose. Directly.</strong>
            <span>Sign once to see who they are, with your card on file and nothing charged. Then call them yourself.</span>
          </div>
          <div className={styles.step}>
            <strong>One flat fee, only if you hire.</strong>
            <span>You see the fee before you sign. No percentages, no surprises.</span>
          </div>
        </div>

        <section className={styles.works}>
          <h2>Why it works</h2>
          <p>
            Our candidates have been coached to understand where they shine and what role they belong in. When someone who knows
            what they&rsquo;re looking for meets an owner who knows what they need, that&rsquo;s a setup for success.
          </p>
        </section>

        <h2 className={styles.h2}>What we won&rsquo;t do</h2>
        <ul className={styles.wont}>
          <li>Ask you to sit through an intake call before you can see anyone.</li>
          <li>Hand you checklists and homework.</li>
          <li>Tell you how to run your business, or who you should hire.</li>
          <li>Charge you anything unless you hire.</li>
        </ul>
        <p className={styles.sign}>The founders of {brandName()}</p>
      </article>

      <section className={styles.closing}>
        <div className="wrap">
          <h2>It&rsquo;s your business. Pick your people.</h2>
          <p>Free to browse. No account needed to look around.</p>
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
