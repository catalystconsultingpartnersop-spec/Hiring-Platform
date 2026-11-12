import { keepCandidatesOut } from "@/lib/candidateMode";
import type { Metadata } from "next";
import Link from "next/link";
import styles from "./why.module.css";

export const metadata: Metadata = {
  title: "Our story",
  description: "Why we started The Candidate Collection: get to know candidates first, give owners real options, and a fee that sets every hire up to succeed.",
};

// Our story, in Heshy's words: why hiring frustrates everyone, what we do
// differently, and why the fee works the way it does.
export default async function WhyPage() {
  await keepCandidatesOut();
  return (
    <>
      <section className={styles.hero}>
        <div className="wrap">
          <p className={styles.label}>Our story</p>
          <h1>We asked a simple question.</h1>
          <p className={styles.lead}>What if hiring started with the person?</p>
        </div>
      </section>

      <article className={`wrap ${styles.body}`}>
        <p>
          Every business owner knows how it goes. A position opens, and the search begins. Post the job, sort the résumés,
          interview, decide.
        </p>
        <p>
          Every candidate knows the other side of it. Send the résumé, wait, and try to fit into a role that may or may not fit
          them.
        </p>
        <p>
          Both sides want the same thing: the right person in the right seat. Yet the process keeps them apart until the very end.
        </p>
        <p className={styles.punch}>We thought there was a better way.</p>

        <h2 className={styles.h2}>Start with the person.</h2>
        <p>
          Everyone has work they&rsquo;re naturally great at. When people find it, they thrive, and so does the business that hires
          them.
        </p>
        <p>
          So that&rsquo;s where we start. We sit down with candidates one by one. We learn their strengths, how they like to work,
          and what they want to do next. We help them see where they belong, and we get to know them well.
        </p>

        <h2 className={styles.h2}>So when you&rsquo;re hiring, we already know people.</h2>
        <p>
          By the time you tell us about your position, we&rsquo;re not starting a search. We&rsquo;re thinking about people
          we&rsquo;ve met. People who are available, and looking for exactly this kind of work.
        </p>
        <p>
          You see them, you meet them, you choose. <strong>It&rsquo;s your business, and every decision stays yours.</strong>
        </p>

        <h2 className={styles.h2}>A fee that&rsquo;s fair and simple.</h2>
        <p>
          One flat fee, paid the day you decide to hire. Never a percentage of salary, and nothing at all if you don&rsquo;t hire.
        </p>
        <p>
          Why the day you hire? Because a new hire does best when everyone starts all in. Once the decision is made, it&rsquo;s done,
          and the focus is on the work. <Link href="/billing">Our billing philosophy</Link>
        </p>

        <h2 className={styles.h2}>That&rsquo;s the whole idea.</h2>
        <div className={styles.steps} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <div className={styles.step}>
            <strong>Candidates</strong>
            <span>in work that fits them.</span>
          </div>
          <div className={styles.step}>
            <strong>Owners</strong>
            <span>with great options.</span>
          </div>
          <div className={styles.step}>
            <strong>Hires</strong>
            <span>that start strong.</span>
          </div>
        </div>
        <p style={{ marginTop: 26 }}>
          We started The Candidate Collection to make hiring feel the way it should. We&rsquo;d love to show you how it works.
        </p>
      </article>

      <section className={styles.closing}>
        <div className="wrap">
          <h2>Let&rsquo;s talk.</h2>
          <p>A short video call with our founders. Tell us who you need, and hear what we have to offer.</p>
          <div className={styles.actions}>
            <Link className="btn btn-gold" href="/meet">
              Meet the founders
            </Link>
            <Link className={`btn btn-ghost ${styles.light}`} href="/candidates">
              Browse candidates
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
