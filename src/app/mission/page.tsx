import type { Metadata } from "next";
import Link from "next/link";
import { brandName } from "@/lib/format";
import styles from "./mission.module.css";

export const metadata: Metadata = {
  title: `Our mission | ${brandName()}`,
  description: "We help people discover their natural strengths and character, so they can find work that truly fits them.",
};

export default function MissionPage() {
  return (
    <>
      <section className={styles.hero}>
        <div className="wrap">
          <p className={styles.label}>Our mission</p>
          <h1>Every person is built for something.</h1>
          <p className={styles.lead}>
            We help people discover their natural strengths and character, so they can find work that truly fits them.
            And a person in the right job is the best hire you&rsquo;ll ever make.
          </p>
        </div>
      </section>

      <article className={`wrap ${styles.body}`}>
        <section>
          <span className={styles.num}>1</span>
          <div>
            <h2>It starts with a real conversation</h2>
            <p>
              Before anyone is listed here, we sit down with them. Not a quick screening call, but a real conversation
              about who they are. What kind of work gives them energy, and what drains them. Where they&rsquo;ve
              thrived, and where they&rsquo;ve struggled. What they&rsquo;re proud of, and what they want next.
            </p>
            <p>
              Alongside the conversation, we use proven assessment methods that show how a person naturally works: the
              tasks they&rsquo;re wired to love, the ones they can do when needed, and the ones that wear them down.
            </p>
          </div>
        </section>

        <section className={styles.quote}>
          <span className={styles.num}>2</span>
          <div>
            <h2>An old idea that still holds true</h2>
            <p>
              Almost a thousand years ago, Rabbeinu Bachya wrote in <em>Chovos HaLevavos</em> (Duties of the Heart)
              that every person is created with a natural love for a certain kind of work, and that a person should
              seek the work that fits his nature and character.
            </p>
            <blockquote>
              In Hebrew, those inner traits are called <strong>techunos hanefesh</strong>, the qualities of the soul.
              Helping each person discover theirs is the heart of what we do.
            </blockquote>
          </div>
        </section>

        <section>
          <span className={styles.num}>3</span>
          <div>
            <h2>Strengths, and honesty about the rest</h2>
            <p>
              We help every candidate see their strengths clearly, and we&rsquo;re honest with them about their
              weaknesses too. Then we look at which careers actually make sense for the person in front of us. Not the
              job that&rsquo;s easiest to fill. The one where they&rsquo;ll do their best work.
            </p>
          </div>
        </section>

        <section>
          <span className={styles.num}>4</span>
          <div>
            <h2>What that means for you</h2>
            <p>
              When you browse here, you&rsquo;re meeting people who already know what they bring. They aren&rsquo;t
              looking for just any job. They&rsquo;re looking for one that matches who they are, and every profile
              tells you, in plain words, what they&rsquo;re great at. So you both start the relationship set up for
              success.
            </p>
          </div>
        </section>

        <section>
          <span className={styles.num}>5</span>
          <div>
            <h2>Dignity, always</h2>
            <p>
              Looking for work can be hard. Every candidate who comes to us is treated with dignity and respect, and our
              coaching is free for them. We&rsquo;re here to help people shine, not to fill seats.
            </p>
          </div>
        </section>

        <p className={styles.honest}>
          We don&rsquo;t promise that every hire will work out. Plenty has to go right for that. But it&rsquo;s a real
          start, and a far better one.
        </p>
      </article>

      <section className={styles.closing}>
        <div className="wrap">
          <h2>Meet people who know what they&rsquo;re built for.</h2>
          <div className={styles.actions}>
            <Link className="btn btn-gold" href="/candidates">
              Browse candidates
            </Link>
            <Link className={`btn btn-ghost ${styles.light}`} href="/apply">
              I&rsquo;m looking for work
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
