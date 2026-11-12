import { keepCandidatesOut } from "@/lib/candidateMode";
import { allListed } from "@/lib/catalog";
import type { Metadata } from "next";
import Link from "next/link";
import s from "./how.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "How it works",
  description: "What The Candidate Collection does, how hiring through us works step by step, who we are, and the questions business owners ask.",
};

type QA = [string, React.ReactNode];

// Everything a business owner checking us out wants to know, in one place:
// what we do, the steps, who we are, and straight answers to their questions.
// Every answer here matches the agreement and how the site really works.
export default async function HowItWorks() {
  await keepCandidatesOut();
  const { rows } = await allListed();
  const n = rows.length >= 10 ? rows.length : null;
  const roles = [...new Set(rows.map((c) => c.role_category).filter(Boolean) as string[])].slice(0, 6);

  const candidates: QA[] = [
    [
      "Who are the candidates?",
      <>
        {n ? `${n} people right now` : "People"} who are ready for their next role
        {roles.length >= 3 ? `, in roles like ${roles.slice(0, -1).join(", ").toLowerCase()} and ${roles.at(-1)!.toLowerCase()}` : ""}. The
        collection keeps growing.
      </>,
    ],
    [
      "How do you know them?",
      "We sit down with each one. We go through their experience, they take a career strengths assessment, and we learn what kind of work they're looking for next. That's what lets us tell you who fits your position.",
    ],
    [
      "Can I look before I talk to anyone?",
      <>
        Yes. <Link href="/candidates">Browse the collection</Link> any time. Every profile shows their strengths, experience, the kind of role
        they want and their salary range.
      </>,
    ],
    [
      "Why don't I see names right away?",
      "Candidates trust us with their names and contact details, so we share them only with employers who are serious. You see who they are as soon as you sign for that candidate.",
    ],
  ];
  const working: QA[] = [
    [
      "What happens on the call with your team?",
      "It's a short video call on Google Meet, and you pick the length: 10, 20 or 30 minutes. A phone call works too. You tell us about the position, we explain how we work, and we tell you who might fit.",
    ],
    [
      "What do I sign?",
      "One short agreement per candidate, signed online, with a card on file. Nothing is charged when you sign. The card is held securely by Stripe.",
    ],
    [
      "How do I meet a candidate?",
      "Once you've signed, you offer a few times for a first call on their page and they pick one. From there you interview them, meet in person, and ask for references, all at your own pace.",
    ],
    [
      "Who makes the decision?",
      "You do. We introduce people we know. The interviews, the references and the decision to hire are yours.",
    ],
    [
      "What else is included?",
      <>
        Ready-to-use hiring documents with your first candidate: offer letter, confidentiality agreement, interview scorecard, reference
        questions and a first-90-days plan. Plus our <Link href="/hiring-help">hiring help</Link> articles, open to everyone.
      </>,
    ],
  ];
  const fee: QA[] = [
    [
      "What does it cost?",
      <>
        One flat fee of $5,000, once, and only if you hire. Never a percentage of salary. You see the fee on every profile before you sign
        anything. <Link href="/billing">Our billing philosophy</Link> explains why.
      </>,
    ],
    ["When do I pay?", "The day you decide to hire. You tell us on the site, the fee is charged to your card on file, and that's it."],
    ["What if I meet someone and don't hire them?", "You owe nothing. Let us know with one tap, and look at someone else whenever you like."],
    [
      "What if I already know the person?",
      "Tell us within two business days of signing and send something dated from before that shows it, like an application they sent you. Then there's no fee.",
    ],
    [
      "What if it doesn't work out?",
      "If they never start work, you can ask for a refund within 30 days of paying. Once someone has started, the fee isn't refunded. That's why nothing is charged until you've met them, interviewed them and checked references, and you're ready to decide.",
    ],
    ["What if I hire them later on?", "If you hire someone we introduced within 12 months of the introduction, the same flat fee applies."],
  ];
  const group = (title: string, items: QA[]) => (
    <div className={s.group}>
      <h3>{title}</h3>
      <dl>
        {items.map(([q, a]) => (
          <div key={q}>
            <dt>{q}</dt>
            <dd>{a}</dd>
          </div>
        ))}
      </dl>
    </div>
  );

  return (
    <>
      <section className={s.hero}>
        <div className="wrap">
          <p className={s.label}>How it works</p>
          <h1>We know our candidates. That&rsquo;s the whole idea.</h1>
          <p className={s.lead}>What we do, how it works step by step, who we are, and straight answers to the questions owners ask.</p>
        </div>
      </section>

      <section className={s.what}>
        <div className={`wrap ${s.whatGrid}`}>
          <div>
            <p className={s.labelDark}>What we do</p>
            <h2>We get to know candidates first. Then we introduce them to you.</h2>
          </div>
          <div className={s.whatBody}>
            <p>
              A résumé isn&rsquo;t a candidate. So we don&rsquo;t collect résumés. We sit down with people who are ready for their next role,
              go through their experience, have them take a career strengths assessment, and learn what kind of work fits them.
            </p>
            <p>
              <b>That&rsquo;s The Candidate Collection:</b> {n ? `${n} people` : "people"} we know, ready now. When you have a position to
              fill, you tell us about it, and you meet the ones who fit.
            </p>
          </div>
        </div>
      </section>

      <section className={s.stepsSec}>
        <div className="wrap">
          <p className={s.labelDark}>Step by step</p>
          <h2>From &ldquo;I need to hire&rdquo; to &ldquo;welcome aboard.&rdquo;</h2>
          <ol className={s.steps}>
            <li>
              <b>Talk to our team</b>
              <p>A short video call. Tell us about the position and the kind of person who&rsquo;d thrive in it.</p>
            </li>
            <li>
              <b>See who fits</b>
              <p>We point you to the people we know who fit, or you browse the collection yourself.</p>
            </li>
            <li>
              <b>Sign to meet them</b>
              <p>One short agreement, card on file, nothing charged. You see their name, résumé and full profile.</p>
            </li>
            <li>
              <b>Interview at your pace</b>
              <p>A first call, a meeting, references. Take the time you need.</p>
            </li>
            <li>
              <b>Decide</b>
              <p>Hiring? One flat fee of $5,000, paid that day. Not a fit? You owe nothing.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className={s.who}>
        <div className={`wrap ${s.whoGrid}`}>
          <div>
            <p className={s.label}>Who we are</p>
            <h2>The people who met the candidates.</h2>
          </div>
          <div>
            <p>
              We&rsquo;re a small team at Catalyst Consulting Partners, a business consulting firm. Working with business owners, we kept
              hearing the same thing about hiring, so we built a better way to do it.
            </p>
            <p>
              Every candidate in the collection has sat down with one of us. So when you talk to our team, you&rsquo;re talking to people who
              know them.
            </p>
            <Link className="btn btn-gold" href="/meet">
              Meet the team
            </Link>
          </div>
        </div>
      </section>

      <section className={s.faq}>
        <div className="wrap">
          <p className={s.labelDark}>Questions owners ask</p>
          <h2>Straight answers.</h2>
          <div className={s.groups}>
            {group("The candidates", candidates)}
            {group("Working with us", working)}
            {group("The fee", fee)}
          </div>
        </div>
      </section>

      <section className={s.close}>
        <div className="wrap">
          <h2>Another question? Ask us.</h2>
          <p>Tell our team what you&rsquo;re looking for. We&rsquo;ll tell you who might fit.</p>
          <Link className={`btn btn-gold ${s.closeBtn}`} href="/meet">
            Talk to our team
          </Link>
          <span>A short video call, at a time that works for you</span>
        </div>
      </section>
    </>
  );
}
