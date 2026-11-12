import { keepCandidatesOut } from "@/lib/candidateMode";
import type { Metadata } from "next";
import Link from "next/link";
import styles from "../why/why.module.css";

export const metadata: Metadata = {
  title: "Our billing philosophy",
  description: "One flat fee, paid the day you decide to hire. Why we bill this way, in plain words.",
};

// Why the fee is flat and paid on the day of hiring. Short on purpose:
// linked from every place the fee is mentioned.
export default async function BillingPage() {
  await keepCandidatesOut();
  return (
    <>
      <section className={styles.hero}>
        <div className="wrap">
          <p className={styles.label}>Our billing philosophy</p>
          <h1>One flat fee, paid the day you hire.</h1>
          <p className={styles.lead}>Here&rsquo;s why we bill this way.</p>
        </div>
      </section>

      <article className={`wrap ${styles.body}`}>
        <h2 className={styles.h2}>A fair fee, not a percentage.</h2>
        <p>
          We don&rsquo;t go out searching on your behalf. We introduce you to people we already know. So there&rsquo;s no reason for
          a percentage of salary. It&rsquo;s one flat fee, and you see it on every candidate&rsquo;s profile before you sign anything.
        </p>

        <h2 className={styles.h2}>Why charge at all?</h2>
        <p>
          A fair fee keeps everyone motivated to do the work well: getting to know every candidate, and
          growing the collection with great people.
        </p>

        <h2 className={styles.h2}>Why the day you hire?</h2>
        <p>
          Because a new hire has the best chance of succeeding when both sides are all in from day one. When a bill is due weeks
          after someone starts, those first weeks quietly become a trial. Everyone is still deciding.
        </p>
        <p className={styles.punch}>A hire works best when the commitment is complete from day one.</p>
        <p>
          By the time you decide to hire, you&rsquo;ve met them, interviewed them, and checked references. You pay the fee, and
          it&rsquo;s done. When your new hire walks in, there&rsquo;s nothing hanging over either of you. Just the work.
        </p>

        <h2 className={styles.h2}>How it works, step by step.</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <strong>See who they are</strong>
            <span>Sign once, with a card on file. Nothing is charged.</span>
          </div>
          <div className={styles.step}>
            <strong>Meet and interview</strong>
            <span>Take your time. Talk, interview, check references.</span>
          </div>
          <div className={styles.step}>
            <strong>Decide to hire</strong>
            <span>The flat fee is paid then, and that&rsquo;s it.</span>
          </div>
          <div className={styles.step}>
            <strong>Not a fit?</strong>
            <span>You owe nothing.</span>
          </div>
        </div>
      </article>

      <section className={styles.closing}>
        <div className="wrap">
          <h2>Questions about how it works? We&rsquo;re here to talk.</h2>
          <div className={styles.actions}>
            <Link className="btn btn-gold" href="/meet">
              Meet the founders
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
