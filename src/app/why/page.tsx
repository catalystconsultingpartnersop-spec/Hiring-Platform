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
          <h1>Why hiring needed a new model.</h1>
          <p className={styles.lead}>What isn&rsquo;t working in hiring today, and the model we built in response.</p>
        </div>
      </section>

      <article className={`wrap ${styles.body}`}>
        <h2 className={styles.h2}>Hiring starts with the position.</h2>
        <p>
          Most hiring works backward from an opening. Write a job description, collect résumés, screen for past titles and
          industries, interview the closest matches. It&rsquo;s a reasonable process, but it measures the wrong thing. A résumé
          shows where someone has been. It says very little about where they&rsquo;ll do their best work.
        </p>

        <h2 className={styles.h2}>Mismatches are expensive.</h2>
        <p>
          Many people are working outside their strengths, often because their résumé kept them in one role or one industry. They
          underperform, they move on, and the position opens again. For the business, each mismatch costs time, money and momentum.
        </p>

        <h2 className={styles.h2}>Owners need options, not advice.</h2>
        <p>
          Business owners know their businesses. What they need is a short list of qualified people who actually want the work.
          Today the choice is usually between a stack of unscreened résumés and a costly search. Neither reliably delivers that.
        </p>
        <p className={styles.punch}>So we reversed the order: start with the person, not the position.</p>

        <h2 className={styles.h2}>How our model works.</h2>
        <p>
          Candidates come to us first. We sit down with each one, assess their strengths, and learn what kind of work they want and
          where they&rsquo;ll do it well. Experience still matters. It&rsquo;s one part of the picture, not the whole of it.
        </p>
        <p>
          The result is a collection of candidates we already know. When an owner tells us about a position, we aren&rsquo;t
          starting a search. We introduce people we&rsquo;ve already met, who are available and looking for that kind of work.
          Owners can browse on their own, or ask us to help narrow it down.
        </p>
        <p>We don&rsquo;t recruit people out of their jobs. Candidates come to us because they&rsquo;re ready for a move.</p>

        <h2 className={styles.h2}>Why the fee is structured this way.</h2>
        <p>
          Because we aren&rsquo;t running a separate search for each client, a percentage of salary doesn&rsquo;t make sense. We
          charge one flat fee, shown up front on every candidate&rsquo;s profile.
        </p>
        <p>
          The fee is due when the owner decides to hire, not weeks later. A delayed invoice turns the first month into an
          evaluation period, which works against the new hire. Paying at the point of decision means both sides start fully
          committed, and that gives the hire the best chance to succeed. <Link href="/billing">Our billing philosophy</Link>
        </p>

        <h2 className={styles.h2}>The outcome.</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <strong>For candidates</strong>
            <span>Work that fits their strengths.</span>
          </div>
          <div className={styles.step}>
            <strong>For owners</strong>
            <span>Fewer, better options, and every decision stays theirs.</span>
          </div>
          <div className={styles.step}>
            <strong>For the hire</strong>
            <span>A start on solid ground, with everyone committed.</span>
          </div>
        </div>
        <p className={styles.sign}>The founders of The Candidate Collection</p>
      </article>

      <section className={styles.closing}>
        <div className="wrap">
          <h2>A revolutionary way of hiring. Let&rsquo;s talk.</h2>
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
