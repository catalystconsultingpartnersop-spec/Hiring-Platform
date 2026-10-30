import type { Metadata } from "next";
import Link from "next/link";
import { CAREER_ARTICLES } from "@/lib/careerArticles";
import { brandName } from "@/lib/format";
import styles from "./join.module.css";

export const metadata: Metadata = {
  title: `Looking for work? | ${brandName()}`,
  description:
    "Sit down with us, discover what you're naturally great at, and meet employers who need exactly that. It doesn't cost you a thing.",
  // Candidates' own link preview, without the employer picture.
  openGraph: {
    type: "website",
    title: "Looking for work? Feel like no one is listening?",
    description: "Everyone has talent. Sometimes it just needs someone to bring it out. Let's find yours.",
    images: [{ url: "/share/og-candidate.png", width: 1200, height: 630, alt: "Looking for work? Feel like no one is listening? Everyone has talent." }],
  },
  twitter: { card: "summary_large_image", images: ["/share/og-candidate.png"] },
};

const STEPS = [
  {
    t: "Tell us a little about you",
    d: "Two minutes. Your name, how to reach you, and the kind of work you're hoping for. Not sure yet? That's fine.",
  },
  {
    t: "Sit down with us",
    d: "A relaxed 45-minute video call. We get to know you, what you enjoy and what you're naturally great at.",
  },
  {
    t: "We write your profile",
    d: "We describe how you work in plain words. Your name and contact details stay private.",
  },
  {
    t: "Employers ask to meet you",
    d: "Business owners browse our candidates. When one wants to meet you, they reach out directly.",
  },
];

const PROMISES = [
  ["A real conversation, not a form", "Every person who joins sits down with one of us. You're a person, not a keyword match."],
  ["Your name stays private", "Employers see what you're great at, not who you are, until they sign an agreement to meet you."],
  ["It doesn't cost you a thing", "Our job is to help you find work that fits you."],
  ["You'll always know where you stand", "You get your own page that shows what's happening, with no chasing anyone for updates."],
  ["You're in control", "Need a break? Found a job? Hide your profile yourself, any time, with one click."],
] as const;

const FAQ = [
  ["Does it cost anything?", "No. It doesn't cost you a thing."],
  [
    "Will my current boss see that I'm looking?",
    "Your profile doesn't show your name, and you can tell us companies that should never see it. We do our best to keep you hidden from them.",
  ],
  [
    "What if I don't know what job I want?",
    "Many people don't, and that's what the conversation is for. We'll help you figure out where you'd shine.",
  ],
  ["Do I need a resume?", "It helps, but you can send it later, or we can work from what you tell us."],
  [
    "How long until I hear from employers?",
    "It varies with the kind of work and the season. Your page shows when employers look at your profile and when one asks to meet you.",
  ],
] as const;

export default function JoinPage() {
  return (
    <>
      <section className={styles.hero}>
        <div className={`wrap ${styles.heroGrid}`}>
          <div>
            <p className={styles.kicker}>For people looking for work</p>
            <h1 className={styles.h1}>
              You&rsquo;re built for something.
              <span>Let&rsquo;s find it together.</span>
            </h1>
            <p className={styles.lede}>
              We sit down with you, learn what you&rsquo;re naturally great at, and introduce you to employers who need
              exactly that. It doesn&rsquo;t cost you a thing, it&rsquo;s private, and you&rsquo;ll always know where you stand.
            </p>
            <div className={styles.cta}>
              <Link className="btn btn-gold" href="/apply">
                Become a candidate
              </Link>
              <Link className={styles.signIn} href="/me">
                Already with us? See your page
              </Link>
            </div>
          </div>
          <YourPagePeek />
        </div>
      </section>

      <section className={styles.heard}>
        <div className={`wrap ${styles.heardInner}`}>
          <h2 className={styles.h2}>We hear you.</h2>
          <p>
            Looking for work can feel lonely. Applications disappear. Nobody calls back. It can feel like the world only has
            time for people who are already at the top.
          </p>
          <h3>Here&rsquo;s what we believe.</h3>
          <p>
            Everyone has talent: unique, God-given strengths. The quiet person who notices everything has real value. So
            does the one who talks a lot and gets everyone moving. The key is knowing your nature, what our tradition calls{" "}
            <em>techunos hanefesh</em>, the qualities of the soul.
          </p>
          <h3>That&rsquo;s what we do.</h3>
          <p>
            Using proven methods, we sit with you and help you understand what you&rsquo;re naturally great at, and the kind of
            role where it fits. Then we guide you and put you in front of business owners who are looking for exactly your
            kind of talent.
          </p>
          <p className={styles.heardNote}>
            And it doesn&rsquo;t cost you a thing. Our only job is to help you shine.
          </p>
        </div>
      </section>

      <section className={styles.how}>
        <div className="wrap">
          <h2 className={styles.h2}>How it works</h2>
          <ol className={styles.steps}>
            {STEPS.map((s, i) => (
              <li key={s.t}>
                <span className={styles.num}>{i + 1}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.promise}>
        <div className={`wrap ${styles.promiseGrid}`}>
          <div>
            <p className={styles.label}>How we work with you</p>
            <h2 className={styles.h2}>You&rsquo;ll be treated with dignity and respect. Every step.</h2>
            <p className={styles.promiseLede}>
              Looking for work can be hard. We want this to be the one part of it that feels good.
            </p>
          </div>
          <ul className={styles.promises}>
            {PROMISES.map(([t, d]) => (
              <li key={t}>
                <strong>{t}</strong>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={styles.strengths}>
        <div className={`wrap ${styles.strengthsGrid}`}>
          <div>
            <h2 className={styles.h2}>Discover what you&rsquo;re naturally great at.</h2>
            <p>
              Most work is a mix of six things: dreaming up questions, coming up with ideas, judging what will work,
              rallying people, helping, and finishing. Most of us are naturally drawn to two of them, and drained by
              others.
            </p>
            <p>
              We help you put words to yours. It changes how you talk about yourself, and it helps employers see where
              you&rsquo;ll shine.
            </p>
          </div>
          <div className={styles.six}>
            {["Asking big questions", "Coming up with ideas", "Judging what will work", "Rallying people", "Helping others", "Finishing the job"].map((w, i) => (
              <span key={w} className={i === 2 || i === 4 ? styles.lit : undefined}>
                {w}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.help} id="career-help">
        <div className="wrap">
          <div className={styles.helpHead}>
            <h2 className={styles.h2}>Career help, free</h2>
            <p>Short, practical guides for every step of finding work. No sign-up needed.</p>
          </div>
          <div className={styles.helpGrid}>
            {CAREER_ARTICLES.map((a) => (
              <Link key={a.slug} href={`/join/help/${a.slug}`} className={styles.helpCard}>
                <strong>{a.title}</strong>
                <span>{a.blurb}</span>
                <em>{a.minutes} min read</em>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.faq}>
        <div className="wrap narrow">
          <h2 className={styles.h2}>Questions people ask</h2>
          {FAQ.map(([q, a]) => (
            <details key={q} className={styles.q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.closing}>
        <div className="wrap">
          <p className={styles.closeLine}>Every person is built for something.</p>
          <h2>Let&rsquo;s find yours.</h2>
          <Link className="btn btn-gold" href="/apply">
            Become a candidate
          </Link>
          <p>
            Rather talk first? <Link href="/contact?kind=work">Ask us to call you</Link>. A real person
            answers.
          </p>
        </div>
      </section>
    </>
  );
}

// A small picture of the candidate's own page, so they can see what they'll get.
function YourPagePeek() {
  const rows = [
    ["done", "You joined", "Welcome!"],
    ["done", "Your conversation", "Great talking with you"],
    ["done", "You're officially a candidate", "Employers can find you"],
    ["now", "Employers want to meet you", "2 have asked so far"],
    ["next", "You're hired", ""],
  ] as const;
  return (
    <div className={styles.peek} aria-hidden="true">
      <p className={styles.peekTop}>Your page</p>
      <p className={styles.peekHi}>Hi Maya, here&rsquo;s where things stand.</p>
      <ol className={styles.peekList}>
        {rows.map(([s, t, d]) => (
          <li key={t} className={styles[s]}>
            <i />
            <div>
              <b>{t}</b>
              {d && <small>{d}</small>}
            </div>
          </li>
        ))}
      </ol>
      <div className={styles.peekStats}>
        <div>
          <strong>14</strong>
          <span>views of your full profile</span>
        </div>
        <div>
          <strong>2</strong>
          <span>asked to meet you</span>
        </div>
      </div>
    </div>
  );
}
