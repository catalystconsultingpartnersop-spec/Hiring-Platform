import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/components/PrintButton";
import { contactPhone, teamUrl } from "@/lib/format";
import { requireStaff } from "@/lib/session";
import { commissionPercent } from "@/lib/settings";
import styles from "./guide.module.css";

export const metadata: Metadata = { title: "Rep guide" };

// Short and clear: what a rep does, and how, in one page.
export default async function RepGuide() {
  await requireStaff();
  const pct = await commissionPercent();
  const team = teamUrl().replace(/^https?:\/\//, "");

  return (
    <article className={styles.guide}>
      <div className={styles.top}>
        <div>
          <p className={styles.eyebrow}>Rep guide</p>
          <h1>Welcome to the team.</h1>
          <p className={styles.lede}>
            Your job is simple and it matters: sit with people looking for work, help them see what they&rsquo;re naturally
            great at, and put them in front of employers who need exactly that. Treat every candidate with dignity and
            respect. The site does the rest.
          </p>
        </div>
        <PrintButton />
      </div>

      <div className={styles.facts}>
        <div>
          <strong>Your sign-in</strong>
          <span>{team}</span>
        </div>
        <div>
          <strong>Your pay</strong>
          <span>{pct}% of the fee on every hire of a candidate you brought in</span>
        </div>
        <div>
          <strong>Stuck?</strong>
          <span>Text Heshy at {contactPhone()}</span>
        </div>
      </div>

      <h2>The five things you do</h2>
      <ol className={styles.steps}>
        <li>
          <h3>Set your hours (once)</h3>
          <p>
            Go to <Link href="/admin/hours">My hours</Link>. Paste your Google Meet or Zoom link, pick your time zone, and
            tick the days and times you&rsquo;re free. Candidates can only book you once this is done.
          </p>
          <p className={styles.tip}>
            Google Meet link: meet.google.com → New meeting → Create a meeting for later. Reuse the same link every time.
          </p>
        </li>
        <li>
          <h3>Take the call (45 minutes)</h3>
          <p>
            You get an email and calendar invite for every booking. On the call, get to know them: what gives them
            energy, what drains them, what they&rsquo;ve done, what they want next. Use their Working Genius result if they
            have it. Be warm. For many people, this is the first time someone has really listened.
          </p>
          <p className={styles.tip}>
            Afterwards, mark it <b>Done</b> (or <b>No-show</b>) on <Link href="/admin/calls">My calls</Link>.
          </p>
        </li>
        <li>
          <h3>Write their profile</h3>
          <p>
            Click <Link href="/admin/candidates/new">+ Add candidate</Link> (or open them from Candidates). Add their
            resume, which fills in their details. Tap their Working Genius letters, strongest first. Fill in role,
            location and salary, then a headline and a short story.
          </p>
          <p className={styles.tip}>
            Employers see the profile before they know who it is, so no names, employers or schools in the headline or
            story. Then click <b>List now</b>.
          </p>
        </li>
        <li>
          <h3>Walk them to the hire</h3>
          <p>
            When an employer unlocks one of your candidates, you&rsquo;re emailed at every step: times offered, call
            booked, how it went, meeting, references. The site nudges everyone automatically. You add the human touch: a
            good-luck text before a call, a check-in after, help picking references.
          </p>
          <p className={styles.tip}>
            Your <Link href="/admin">dashboard</Link> shows every introduction and where it stands. If something stalls,
            a quick call from you is the best nudge.
          </p>
        </li>
        <li>
          <h3>Stay in their corner</h3>
          <p>
            If an employer passes, the candidate gets a kind note, and you get the reason. Call them. Keep their profile
            fresh. When they&rsquo;re hired, you&rsquo;re told, and your commission shows on your dashboard.
          </p>
        </li>
      </ol>

      <h2>What employers see, and what they don&rsquo;t</h2>
      <div className={styles.two}>
        <div>
          <p className={styles.label}>Before they sign</p>
          <p>Headline, story, role, experience, area, salary range, and plain-language strengths.</p>
        </div>
        <div>
          <p className={styles.label}>Only after they sign</p>
          <p>Name, contact details and resume. Never your private notes, and never the Working Genius letters.</p>
        </div>
      </div>

      <h2>A few house rules</h2>
      <ul className={styles.rules}>
        <li>Every candidate is free, always. Never ask a candidate for money.</li>
        <li>Speak positively about everyone: candidates, employers and other recruiters.</li>
        <li>Never share a candidate&rsquo;s details outside the site. Employers get them by signing.</li>
        <li>If a candidate finds a job, say congratulations, and set them to Hired or Paused.</li>
        <li>To take someone off the site, set their status to Archived.</li>
      </ul>
    </article>
  );
}
