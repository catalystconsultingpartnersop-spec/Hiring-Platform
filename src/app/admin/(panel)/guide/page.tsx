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
          kind of role they belong in. We use our own Strengths Assessment to put words to it. When a candidate knows
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

      <section id="new" className={styles.mission} style={{ scrollMarginTop: 16 }}>
        <p className={styles.missionLabel}>New this week</p>
        <h2>Less busywork, more time with candidates.</h2>
        <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8 }}>
          <li>
            <b>Your calls record and take notes for you.</b> Every call booked through the site gets its own Google Meet room.
            Afterwards the site drafts the candidate&rsquo;s profile from the conversation and emails you.{" "}
            <a href="#call">How it works</a>
          </li>
          <li>
            <b>One-click reminders.</b> On any candidate&rsquo;s profile, tap <b>Send a reminder</b> to nudge them about the
            assessment, booking, their agreement or their resume. <a href="#call">More</a>
          </li>
          <li>
            <b>More flexible hours.</b> Add several time blocks a day, in 15-minute steps. A block with room for one call is
            one call that fills it, so 1:00 to 1:30 is a 30-minute call and 5:30 to 6:15 is a 45-minute call.{" "}
            <a href="#hours">Set your hours</a>
          </li>
          <li>
            <b>Nothing to sign after the call.</b> Candidates sign their agreement when they apply, so <b>List now</b> puts
            them live right away. <a href="#profile">More</a>
          </li>
          <li>
            <b>Our own Strengths Assessment.</b> Candidates are asked right after booking, and their result lands on their
            profile by itself. They get a reminder the day before if they haven&rsquo;t taken it, and you get a heads-up.
          </li>
          <li>
            <b>Your candidate link shows only the candidate side.</b> People who come in through it or the flyer don&rsquo;t
            see Browse candidates or the business pages for now.
          </li>
        </ul>
      </section>

      <h2>The five things you do</h2>
      <ol className={styles.steps}>
        <li id="hours" style={{ scrollMarginTop: 16 }}>
          <h3>Set your hours (once)</h3>
          <p>
            Go to <Link href="/admin/hours">My hours</Link>. Pick your time zone, tick the days you&rsquo;re free, and add your
            time blocks. Tap <b>+ Add another time</b> for more than one block a day. Times go in 15-minute steps, from 6am
            to midnight. Candidates can only book you once this is done.
          </p>
          <p className={styles.tip}>
            How blocks become calls: a block with room for just one call is one call that fills it (30 to 45 minutes). In a
            longer block, calls are the length you choose at the top of My hours (30 or 45 minutes). The page shows how many
            calls each block holds.
          </p>
          <p className={styles.tip}>
            You don&rsquo;t need your own video link: each booked call gets its own recorded Google Meet room. Your own link is
            only a backup.
          </p>
          <p className={styles.tip}>
            To find candidates, open <Link href="/admin/share#candidates">Share kit</Link> and send the &ldquo;looking for
            work&rdquo; picture to your network. Anyone who signs up through your link is added as yours.
          </p>
        </li>
        <li id="call" style={{ scrollMarginTop: 16 }}>
          <h3>Get them assessed, then take the call</h3>
          <p>
            Candidates are asked to take our free <b>Strengths Assessment</b> as soon as they book (about 8 minutes). When
            they finish, their result lands on their profile by itself and you get an email. The day before your call, if
            it isn&rsquo;t in, the site sends them a friendly reminder from you, and you get a heads-up email saying whether
            it&rsquo;s in. You can also send it to anyone from the Strengths Assessment box on your dashboard.
          </p>
          <p className={styles.tip}>
            Need to nudge someone? Open their profile and use <b>Send a reminder</b>. One tap sends a friendly email from
            you: take our Strengths Assessment, book their call, sign their agreement, or send their resume. Replies
            come straight to your inbox, and the same reminder can&rsquo;t go out twice in two days, so you never have to
            chase anyone yourself.
          </p>
          <p>
            You get an email and calendar invite for every booking. On the call, get to know them: what gives them
            energy, what drains them, what they&rsquo;ve done, what they want next. Walk through their Strengths Assessment
            together: their two natural strengths (the work that gives them energy), the two they can do well, and the two
            that wear them down. Then talk about the roles where that would shine. Be warm. For many people, this is the first time
            someone has really listened.
          </p>
          <p className={styles.tip}>
            Afterwards, mark it <b>Done</b> (or <b>No-show</b>) on <Link href="/admin/calls">My calls</Link>.
          </p>
          <p className={styles.tip}>
            <b>Recorded calls:</b> calls booked through the site get their own Google Meet room that records and takes notes
            on its own, so you can just talk. Open the link from your booking email (or <b>Join</b> on My calls); nobody needs
            to admit anyone. After the call, the site drafts their profile from the conversation (headline, summary, highlights,
            full profile, plus private notes for the team) and emails you. It only fills in what you haven&rsquo;t written.
            Read it, make it yours, and list them. You can also click <b>Draft the profile from the call</b> on their profile.
          </p>
        </li>
        <li id="profile" style={{ scrollMarginTop: 16 }}>
          <h3>Write their profile</h3>
          <p>
            If their call was recorded, most of this is already drafted for you: open them from Candidates and start at the
            &ldquo;From the call&rdquo; box. Otherwise, click <Link href="/admin/candidates/new">+ Add candidate</Link> (or
            open them from Candidates). Add their
            resume, which fills in their details. Their strengths fill in by themselves once they take our Strengths Assessment;
            you can change the order if the call tells you otherwise. The site then suggests roles and words for the headline. Fill in role,
            location and salary, then a headline and a short story.
          </p>
          <p className={styles.tip}>
            Employers see the profile before they know who it is, so no names, employers or schools in the headline or
            story. Then click <b>List now</b> and they&rsquo;re live right away. Candidates who applied on the site already signed
            their candidate agreement when they applied. Anyone you add yourself gets it by email to sign; it doesn&rsquo;t
            hold their profile back. Once a month, each of your live candidates gets a short &ldquo;still
            looking?&rdquo; email signed by you; their replies come straight to you. If they don&rsquo;t answer within 5 days,
            we&rsquo;ll email you. Give them a call, and if they&rsquo;re no longer looking, set their profile to Paused.
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
          <p>Name, contact details and resume. Never your private notes, and never their assessment results.</p>
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
