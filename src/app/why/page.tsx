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
          <h1>Why we started The Candidate Collection.</h1>
          <p className={styles.lead}>Hiring was frustrating for everyone. So we turned it around.</p>
        </div>
      </section>

      <article className={`wrap ${styles.body}`}>
        <p>
          I started The Candidate Collection because I was frustrated with the way hiring works. And I wasn&rsquo;t the only one.
          Candidates feel no one is really listening to them. Business owners get told how to run their business. And most hiring
          works the same way: start with an opening, then hunt for someone to fit into it.
        </p>

        <h2 className={styles.h2}>Everyone has a place where they belong.</h2>
        <p>
          The right hire isn&rsquo;t whoever happens to be closest. Everyone has a place where they shine, and finding it starts
          with understanding the person.
        </p>
        <p>
          So many people are in jobs that don&rsquo;t fit them. They never had the chance to figure out what they&rsquo;re good
          at, so they end up doing work outside their strengths. Their résumé says they did this and that in one industry, so that&rsquo;s
          where they stay. They aren&rsquo;t happy, and neither are the people they work for.
        </p>

        <h2 className={styles.h2}>What business owners really want.</h2>
        <p>
          When you have a position to fill, it&rsquo;s hard to know where to start. You post in community chats and WhatsApp groups
          and get a pile of résumés. Or you bring in outside help, and with it comes a big fee and plenty of advice.
        </p>
        <p className={styles.punch}>Most owners don&rsquo;t want a lot of advice. They want options.</p>
        <p>&ldquo;I have a position open. Show me some people who fit.&rdquo;</p>

        <h2 className={styles.h2}>So we did the opposite.</h2>
        <p>
          Candidates come to us. We sit with each one, understand their skills, and help them see where they belong: the right
          role, the right seat, the right environment. Their experience counts too, of course.
        </p>
        <p>
          So when you tell us what you need, we don&rsquo;t go out searching. If we have someone who fits, we&rsquo;ve already
          met them. <strong>Browse them yourself, or let us help you choose.</strong>
        </p>
        <p>
          We don&rsquo;t pull people out of their jobs. Candidates come to us because they want to make a move, and we keep
          growing the collection, always looking for more great people.
        </p>

        <h2 className={styles.h2}>Why our fee works the way it does.</h2>
        <p>
          We don&rsquo;t need big percentages. We don&rsquo;t go out hunting on your behalf. We have the candidates, and we&rsquo;re
          happy to show them to you.
        </p>
        <p>
          We do charge a fee, a reasonable one. A fair fee keeps everyone motivated to do the work right.
        </p>
        <p>
          How the fee is paid matters to us just as much. In the usual setup, a big bill comes due 30 or 60 days after the new hire
          starts. Those first weeks become a trial, with everyone still deciding. We&rsquo;d rather a new hire start with everyone
          all in.
        </p>
        <p className={styles.punch}>A hire works when the commitment is complete from day one. Trial periods rarely do.</p>
        <p>
          So with us, you pay when you decide to hire. By then you&rsquo;ve met them, interviewed them, checked references, and
          you&rsquo;re committed to making it work. One flat, reasonable fee, and it&rsquo;s done. When your new hire walks in on the
          first day, there&rsquo;s no bill hanging over either of you. Just the work, and the best possible start.
        </p>
        <p>
          <strong>It&rsquo;s healthier for everyone.</strong> <Link href="/billing">More on our billing philosophy</Link>
        </p>
        <p className={styles.sign}>Heshy, founder</p>
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
