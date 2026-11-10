import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/components/PrintButton";
import { contactPhone, teamUrl } from "@/lib/format";
import { requireStaff } from "@/lib/session";
import { commissionPercent } from "@/lib/settings";
import { commissionTerms } from "@/lib/adminData";
import { FINDER_PCT } from "@/lib/finder";
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
          <span>
            {commissionTerms(row, pct)} on your candidates, plus {FINDER_PCT}% on owners you introduce. <a href="#pay">How it works</a>
          </span>
        </div>
        <div>
          <strong>Stuck?</strong>
          <span>Text Heshy at {contactPhone()}</span>
        </div>
      </div>

      <section id="pay" className={styles.mission} style={{ scrollMarginTop: 16 }}>
        <p className={styles.missionLabel}>How you earn</p>
        <h2>Your candidates, plus an extra.</h2>
        <div className={styles.two}>
          <div>
            <p className={styles.label}>1. Your candidates</p>
            <p>
              When a candidate you brought in is hired, you earn <b>{commissionTerms(row, pct)}</b>. That&rsquo;s the rate set for
              you, and it&rsquo;s the rate you get.
            </p>
          </div>
          <div>
            <p className={styles.label}>2. Extra: your introductions</p>
            <p>
              When you introduce a business owner through the site and they hire, you earn <b>{FINDER_PCT}% of the fee</b>. On
              anyone&rsquo;s candidate, yours included. It counts when you tap <b>Suggest</b> on a candidate and send it to the
              owner, or when the owner signs up through your Share kit link.
            </p>
          </div>
        </div>
        <p className={styles.tip} style={{ marginTop: 10 }}>
          Example, on a $5,000 fee: your own candidate is hired, you earn your rate (at 40%, that&rsquo;s $2,000). You also introduced the owner? Add $
          {((5000 * FINDER_PCT) / 100).toLocaleString("en-US")}. Commission is paid within 30 days after we collect the fee and the
          candidate starts. It&rsquo;s private: other reps never see yours, and you never see theirs. Track it on your{" "}
          <Link href="/admin#earnings">dashboard</Link>.
        </p>
        <p className="small muted" style={{ margin: "8px 0 0" }}>
          Small print: the {FINDER_PCT}% counts only when the site records the introduction, meaning you used <b>Suggest</b> or the
          owner came through your link. Introductions made outside the site (a phone call, in person, a forwarded screenshot)
          can&rsquo;t be tracked, so they aren&rsquo;t credited, and we can&rsquo;t review claims for them. Use the site and
          it&rsquo;s counted automatically.
        </p>
        <p className={styles.missionLabel} style={{ marginTop: 18 }}>
          Candidates come first
        </p>
        <p style={{ margin: 0 }}>
          Your main work is with candidates: bringing them in, sitting with them, and getting them placed. If you also know
          business owners, introducing them is a welcome extra. Mark it in the <Link href="/admin/room">Team Room</Link> so
          the team knows who to ask.
        </p>
      </section>

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
            <Link href="/admin/candidates">Browse candidates</Link>
          </p>
          <p>
            Every candidate on the team. Pick a status (new applications, listed, drafts…), filter, sort and group. Tap{" "}
            <b>Only mine</b> for yours. You can view anyone; you edit your own. <b>⭐ Gold standard</b> shows the ones reps marked as worth placing.
          </p>
        </div>
        <div>
          <p className={styles.label}>
            <Link href="/admin/room">Team Room</Link>
          </p>
          <p>Spotlight great candidates, ask &ldquo;who has someone?&rdquo;, celebrate hires, and join team calls.</p>
        </div>
        <div>
          <p className={styles.label}>
            <Link href="/admin/assessments">Strengths Assessment</Link>
          </p>
          <p>Send our free Strengths Assessment to anyone and see the results.</p>
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
        <p className={styles.missionLabel}>What&rsquo;s new</p>
        <h2>Built to make you faster.</h2>
        <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8 }}>
          <li>
            <b>The Team Room.</b> One place for the team: spotlight a candidate, post &ldquo;looking for&hellip;&rdquo; when an owner
            needs someone, attach candidates in one tap, and schedule team calls that record themselves and send everyone the
            notes. <Link href="/admin/room">Open it</Link>
          </li>
          <li>
            <b>See every candidate.</b> Candidates shows yours by default; switch to Everyone to browse the whole team&rsquo;s.
            Other reps&rsquo; candidates are view-only.
          </li>
          <li>
            <b>Suggest a candidate.</b> Know an owner who&rsquo;d want to meet someone? Tap <b>Suggest</b> on their page and send it
            by WhatsApp, text or email. You earn the {FINDER_PCT}% introduction share if they hire. <a href="#owners">More</a>
          </li>
          <li>
            <b>⭐ Gold standard.</b> Met someone great? Mark your candidate as gold so the team knows they&rsquo;re worth placing.
            Only the team sees it.
          </li>
          <li>
            <b>Start a call now.</b> On the phone with someone? Tap <b>Start a call now</b> on your dashboard or their profile for a
            recorded video link right away, even before they&rsquo;re in the system.
          </li>
          <li>
            <b>Your call notes, in your inbox.</b> After a recorded call, the site drafts the profile and emails you the notes
            from the call, so you can read them on your phone.
          </li>
          <li>
            <b>Your first take.</b> When adding a candidate, say or type a few lines about them. The site writes the whole
            profile around it, from their resume, or without one.
          </li>
          <li>
            <b>Your candidate link shows only the candidate side.</b> People who come in through it or the flyer don&rsquo;t
            see Browse candidates or the business pages for now.
          </li>
          <li>
            <b>One-click reminders.</b> On any candidate&rsquo;s profile, tap <b>Send a reminder</b> to nudge them about the
            assessment, booking, their agreement or their resume.
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

      <section id="owners" className={styles.mission} style={{ marginTop: 8, scrollMarginTop: 16 }}>
        <p className={styles.missionLabel}>Know business owners?</p>
        <h2>Two easy ways to introduce them.</h2>
        <p>
          <b>Have a specific candidate in mind?</b> Open their page (yours or anyone&rsquo;s) and tap <b>Suggest</b>. Pick WhatsApp,
          text or email, and a short, ready-made message goes out with a link to their anonymous profile. It&rsquo;s recorded as
          your introduction.
        </p>
        <p>
          Everyone has business owners in their contacts. Open <Link href="/admin/share#owners">Share kit</Link> in your menu.
          On your phone, tap <b>Share</b> and pick the person: the message goes out with your link, and WhatsApp shows our
          picture as a preview above it. Want the tall picture itself? Tap <b>Share picture only</b>; the message is copied
          for you, so just paste it as the caption.
        </p>
        <p>
          <b>Or send the share kit.</b> Your link carries your name, so every owner who joins through it is credited to you. You don&rsquo;t need to follow
          up or explain anything. The page they land on does that, and the site takes it from there. Your time still goes to
          candidates. Either way, if they hire, you earn your {FINDER_PCT}% introduction share.
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
        <li>You can view every candidate, but only change your own. To hand one off, change the Rep on their page.</li>
        <li>Commissions are private. Never ask about or discuss another rep&rsquo;s pay.</li>
        <li>If a candidate finds a job, say congratulations, and set them to Hired or Paused.</li>
        <li>To take someone off the site, set their status to Archived.</li>
      </ul>
    </article>
  );
}
