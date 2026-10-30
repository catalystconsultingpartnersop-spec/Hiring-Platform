import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/components/PrintButton";
import { contactPhone, teamUrl } from "@/lib/format";
import { requireStaff } from "@/lib/session";
import { commissionPercent } from "@/lib/settings";
import { commissionTerms } from "@/lib/adminData";
import { db } from "@/lib/db";
import styles from "./guide.module.css";

export const metadata: Metadata = { title: "Rep guide" };

// Short and clear: what a rep does, and how, in one page.
export default async function RepGuide() {
  const me = await requireStaff();
  const pct = await commissionPercent();
  const { data: row } = me.id ? await db().from("staff").select("*").eq("id", me.id).maybeSingle() : { data: null };
  const team = teamUrl().replace(/^https?:\/\//, "");

  return (
    <article className={styles.guide}>
      <div className={styles.top}>
        <div>
          <p className={styles.eyebrow}>Rep guide</p>
          <h1>Welcome to the team.</h1>
          <p className={styles.lede}>
            You&rsquo;re here to help people. You sit with someone looking for work, help them see what they&rsquo;re
            naturally great at, and put them in front of employers who need exactly that.
          </p>
        </div>
        <PrintButton />
      </div>

      <section className={styles.mission}>
        <p className={styles.missionLabel}>Before anything else</p>
        <h2>The mission comes first.</h2>
        <p>
          To be a rep here, you have to care about candidates and genuinely want to help them. That&rsquo;s the
          requirement. Every person who talks to you deserves dignity and respect, whether or not they ever get hired
          through us.
        </p>
        <p>
          Yes, you can earn good money doing this. But the money follows the mission, not the other way around. If you
          ever have to choose between what&rsquo;s right for the candidate and a quick fee, choose the candidate.
        </p>
        <p>
          <strong>Your job, in one line:</strong> help each candidate discover what they&rsquo;re naturally great at, and the
          kind of role they belong in. We use the 6 Working Genius assessment to put words to it. When a candidate knows
          where they shine, and an employer knows what they need, that&rsquo;s a setup for success.
        </p>
        <p className={styles.missionLabel} style={{ marginTop: 16 }}>
          Who we look for
        </p>
        <ul className={styles.qualities}>
          <li>Smart, intuitive people</li>
          <li>Actively in the workforce</li>
          <li>Compassion and empathy</li>
          <li>Believe in what we&rsquo;re building</li>
          <li>Communicate well</li>
          <li>Follow up, every time</li>
        </ul>
      </section>

      <div className={styles.facts}>
        <div>
          <strong>Your sign-in</strong>
          <span>{team}</span>
        </div>
        <div>
          <strong>Your pay</strong>
          <span>{commissionTerms(row, pct)} for candidates you bring in</span>
        </div>
        <div>
          <strong>Stuck?</strong>
          <span>Text Heshy at {contactPhone()}</span>
        </div>
      </div>

      <h2>Your dashboard, at a glance</h2>
      <div className={styles.two} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        <div>
          <p className={styles.label}>
            <Link href="/admin">My dashboard</Link>
          </p>
          <p>Your candidates and where each one stands, your hires, and your commission: earned, owed and paid.</p>
        </div>
        <div>
          <p className={styles.label}>
            <Link href="/admin/candidates">Candidates</Link>
          </p>
          <p>Everyone in the system, by status. Search by name, email or ref, and open anyone to edit their profile.</p>
        </div>
        <div>
          <p className={styles.label}>
            <Link href="/admin/candidates/new">+ Add candidate</Link>
          </p>
          <p>Add someone you know. Upload their resume and most of the details fill themselves in.</p>
        </div>
        <div>
          <p className={styles.label}>
            <Link href="/admin/calls">My calls</Link>
          </p>
          <p>Your booked onboarding calls. After each one, mark it Done or No-show.</p>
        </div>
        <div>
          <p className={styles.label}>
            <Link href="/admin/hours">My hours</Link>
          </p>
          <p>When candidates can book you, and the video link they join.</p>
        </div>
        <div>
          <p className={styles.label}>
            <Link href="/admin/share">Share kit</Link>
          </p>
          <p>Ready-made pictures and messages: one to find candidates, one for business owners. Your links credit you.</p>
        </div>
        <div>
          <p className={styles.label}>
            <Link href="/admin/requests">Requests</Link>
          </p>
          <p>Callback requests sent to you, usually from your own candidates. Mark them handled when you&rsquo;ve called back.</p>
        </div>
        <div>
          <p className={styles.label}>
            <Link href="/admin/guide">Rep guide</Link>
          </p>
          <p>This page. Come back any time.</p>
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
          <p className={styles.tip}>
            To find candidates, open <Link href="/admin/share#candidates">Share kit</Link> and send the &ldquo;looking for
            work&rdquo; picture to your network. Anyone who signs up through your link is added as yours.
          </p>
        </li>
        <li>
          <h3>Get them assessed, then take the call (45 minutes)</h3>
          <p>
            As soon as a candidate books, ask them to take the <b>6 Working Genius assessment</b> at{" "}
            <a href="https://www.workinggenius.com" target="_blank" rel="noreferrer">workinggenius.com</a> before your call.
            They buy it themselves. Ask them to send you their results.
          </p>
          <p>
            You get an email and calendar invite for every booking. On the call, get to know them: what gives them
            energy, what drains them, what they&rsquo;ve done, what they want next. Walk through their Working Genius
            results together: their two geniuses (the work that gives them energy), and their frustrations (the work that
            drains them). Then talk about the roles where that would shine. Be warm. For many people, this is the first time
            someone has really listened.
          </p>
          <p className={styles.tip}>
            Afterwards, mark it <b>Done</b> (or <b>No-show</b>) on <Link href="/admin/calls">My calls</Link>.
          </p>
        </li>
        <li>
          <h3>Write their profile</h3>
          <p>
            Click <Link href="/admin/candidates/new">+ Add candidate</Link> (or open them from Candidates). Add their
            resume, which fills in their details. Tap their Working Genius letters, strongest first, and upload their results
            report (only our team ever sees it). The site then suggests roles and words for the headline. Fill in role,
            location and salary, then a headline and a short story.
          </p>
          <p className={styles.tip}>
            Employers see the profile before they know who it is, so no names, employers or schools in the headline or
            story. Then click <b>List now</b>. The candidate gets a short candidate promise by email (it doesn&rsquo;t cost them a
            thing, and they&rsquo;ll tell us when they&rsquo;re hired). Their profile goes live the moment they sign. If they
            haven&rsquo;t, give them a call.
          </p>
        </li>
        <li>
          <h3>Walk them through</h3>
          <p>
            When an employer unlocks one of your candidates, you&rsquo;re emailed at every step: times offered, call
            booked, how it went, meeting, references. The site guides the client and nudges them automatically, so you
            don&rsquo;t need to call clients. Your personal touch is for the candidate: a good-luck text before a call, a
            check-in after, help picking references.
          </p>
          <p className={styles.tip}>
            Your <Link href="/admin">dashboard</Link> shows every introduction and where it stands. If a candidate stalls,
            call the candidate. If a client stalls, let the site nudge them.
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

      <section className={styles.mission} style={{ marginTop: 8 }}>
        <p className={styles.missionLabel}>Know business owners?</p>
        <h2>Send them the share kit. That&rsquo;s it.</h2>
        <p>
          Everyone has business owners in their contacts. Open <Link href="/admin/share#owners">Share kit</Link> in your menu.
          On your phone, tap <b>Share</b> and pick the person: the message goes out with your link, and WhatsApp shows our
          picture as a preview above it. Want the tall picture itself? Tap <b>Share picture only</b>; the message is copied
          for you, so just paste it as the caption.
        </p>
        <p>
          Your link carries your name, so every owner who joins through it is credited to you. You don&rsquo;t need to follow
          up or explain anything. The page they land on does that, and the site takes it from there. Your time still goes to
          candidates.
        </p>
      </section>

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
        <li>Keep client contact to a minimum. The site guides clients; your time and warmth go to candidates.</li>
        <li>Never advise a client on how to run their business. We help them find vetted candidates.</li>
        <li>Speak positively about everyone: candidates, employers and other recruiters.</li>
        <li>Never share a candidate&rsquo;s details outside the site. Employers get them by signing.</li>
        <li>If a candidate finds a job, say congratulations, and set them to Hired or Paused.</li>
        <li>To take someone off the site, set their status to Archived.</li>
      </ul>
    </article>
  );
}
