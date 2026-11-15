import type { Metadata } from "next";
import Link from "next/link";
import { keepCandidatesOut } from "@/lib/candidateMode";
import { Seen } from "@/components/Seen";
import styles from "./looking.module.css";

export const metadata: Metadata = {
  title: "Not hiring today? Browse anyway",
  description: "Find the one you're looking for, or the one you didn't know you needed. Browse pre-vetted candidates any day, hiring or not.",
};

// For the owner who likes to look: why browsing makes sense even when there's
// no opening today. Reached from posters, the Browse page and the footer; it is
// deliberately not in the top menu.
export default async function JustLookingPage() {
  await keepCandidatesOut();
  return (
    <>
      <Seen step="just_looking" />
      <section className={styles.hero}>
        <div className="wrap">
          <p className={styles.label}>Not hiring today?</p>
          <h1>
            Find the one you&rsquo;re looking for. <span>Or the one you didn&rsquo;t know you needed.</span>
          </h1>
          <p className={styles.lead}>
            Most business owners look at who&rsquo;s available only on the day they need someone. The collection is
            open every day. Come look whenever you like, the way people look at houses long before they move.
          </p>
          <Link href="/candidates" className="btn btn-gold btn-big">
            Browse candidates
          </Link>
        </div>
      </section>

      <section className={`wrap ${styles.body}`}>
        <h2>Why owners browse when they&rsquo;re not hiring</h2>
        <ul className={styles.reasons}>
          <li>
            <h3>You see who&rsquo;s out there before you need them.</h3>
            <p>When a seat opens, you&rsquo;re not starting from zero. You already know the kind of people who are available.</p>
          </li>
          <li>
            <h3>Sometimes you spot a person worth making room for.</h3>
            <p>The right person can show up before the opening does. When you see them, the choice is yours.</p>
          </li>
          <li>
            <h3>When you&rsquo;re ready, you know who you want to meet.</h3>
            <p>Go straight to the people you saved, and skip the search.</p>
          </li>
        </ul>

        <h2>How to browse</h2>
        <div className={styles.how}>
          <div>
            <h3>Open any profile</h3>
            <p>Every candidate sat down with our team first. Each profile tells you, in plain words, what they&rsquo;re great at.</p>
          </div>
          <div>
            <h3>Tap the heart</h3>
            <p>Save anyone who catches your eye to your shortlist, and come back to them later.</p>
          </div>
          <div>
            <h3>Tell us a role</h3>
            <p>
              Leave a role and your cell number at the bottom of the{" "}
              <Link href="/candidates">Browse page</Link>, and we&rsquo;ll text you when someone joins.
            </p>
          </div>
        </div>
        <p className={styles.fee}>One flat fee, only if you hire. Never a percentage of salary.</p>
      </section>

      <section className={styles.closing}>
        <div className="wrap">
          <h2>Take a look. See who&rsquo;s here.</h2>
          <div className={styles.actions}>
            <Link href="/candidates" className="btn btn-gold btn-big">
              Browse candidates
            </Link>
            <Link href="/meet" className={`btn btn-ghost btn-big ${styles.light}`}>
              Hiring now? Meet the team
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
