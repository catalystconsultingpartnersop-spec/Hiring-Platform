import { Audience, kit } from "./emailKit";
import { brandName, candidateUrl, contactPhone, money, siteUrl, teamUrl } from "./format";

// Every email the site sends to clients and candidates, in one place.
// Voice: candidates get warmth (and hear the word "candidate"); clients get
// short, precise next steps. One button per email, no repeats.

export type Mail = { subject: string; html: string; audience: Audience };
const { esc, hi, p, big, button, quiet, box, quote, list } = kit;
const first = (n: string | null | undefined) => (n ?? "").split(" ")[0] || "there";
const MODE: Record<string, string> = { phone: "phone call", video: "video call", in_person: "in person" };

export type MeetingInfo = {
  kind: "call" | "meeting";
  mode: "phone" | "video" | "in_person";
  place: string | null;
  minutes: number;
  note?: string | null;
};
const what = (m: MeetingInfo) => (m.kind === "call" ? "first call" : "meeting");

// ======================= CLIENTS (business owners) =======================

export const owner = {
  signInLink: (link: string): Mail => ({
    audience: "owner",
    subject: `Your sign-in link for ${brandName()}`,
    html:
      p("Here's your link to sign in and set a password. After that, you'll sign in with your email and password.") +
      button(link, "Sign in") +
      quiet("The link works once and expires in 30 minutes. Didn't ask for it? You can ignore this email."),
  }),

  agreementSigned: (o: { name: string | null; candidate: string; candidateId: string; unlockId: string; card: string; agreementHtml: string }): Mail => ({
    audience: "owner",
    subject: `You can meet ${o.candidate} now`,
    html:
      hi(o.name) +
      p(`You're in. You can now see <strong>${esc(o.candidate)}</strong>'s name, resume and phone number.`) +
      p(`The easiest next step is a short first call: offer a few times on their page and ${esc(first(o.candidate))} picks one.`) +
      button(`${siteUrl()}/candidates/${o.candidateId}#next`, `Meet ${first(o.candidate)}`) +
      box(`<strong>Nothing has been charged.</strong> Your ${esc(o.card)} is on file and is only charged if you hire ${esc(first(o.candidate))}. Your signed agreement is below, and <a href="${siteUrl()}/account/agreements/${o.unlockId}" style="color:#17213a">here to print</a>.`) +
      o.agreementHtml,
  }),

  receipt: (o: { name: string | null; candidate: string; candidateId: string; receiptHtml: string }): Mail => ({
    audience: "owner",
    subject: `Receipt: you're hiring ${o.candidate}`,
    html:
      hi(o.name) +
      p(`Payment received. You're all set to hire <strong>${esc(o.candidate)}</strong>. Congratulations.`) +
      p("Next: make the offer. Our offer letter template takes about five minutes.") +
      button(`${siteUrl()}/hiring-help/templates/offer-letter?c=${o.candidateId}`, "Fill in the offer letter") +
      o.receiptHtml,
  }),

  refund: (o: { name: string | null; amount: number; candidate: string; receipt: string }): Mail => ({
    audience: "owner",
    subject: `Refund issued: ${money(o.amount)}`,
    html:
      hi(o.name) +
      p(`We've refunded <strong>${money(o.amount)}</strong> for ${esc(o.candidate)} (receipt ${esc(o.receipt)}).`) +
      p("It usually reaches your card within 5 to 10 business days."),
  }),

  guidedReceived: (o: { name: string | null }): Mail => ({
    audience: "owner",
    subject: "We got your guided hiring request",
    html:
      hi(o.name) +
      p("Thanks. We'll call you within one business day to hear what you need and give you a flat price before anything starts."),
  }),

  noLongerAvailable: (o: { name: string | null; candidate: string; browse: string }): Mail => ({
    audience: "owner",
    subject: `${o.candidate} is no longer available`,
    html:
      hi(o.name) +
      p(`<strong>${esc(o.candidate)}</strong> accepted a job with another employer. Nothing was charged, and you owe nothing for ${esc(first(o.candidate))}.`) +
      p("There are other strong candidates, and we're happy to point you to the best fits.") +
      button(o.browse, "See similar candidates"),
  }),

  startNudge: (o: { name: string | null; candidate: string; candidateId: string; phone: string | null }): Mail => ({
    audience: "owner",
    subject: `Ready to talk to ${first(o.candidate)}?`,
    html:
      hi(o.name) +
      p(`Good candidates don't wait long. The easiest next step with <strong>${esc(o.candidate)}</strong> is a short first call: offer three times and ${esc(first(o.candidate))} picks one.`) +
      button(`${siteUrl()}/candidates/${o.candidateId}#next`, "Offer a few times") +
      quiet(`Or just call ${esc(first(o.candidate))}${o.phone ? ` at ${esc(o.phone)}` : ""}.`),
  }),

  booked: (o: { name: string | null; candidate: string; candidateId: string; when: string; how: string; m: MeetingInfo }): Mail => ({
    audience: "owner",
    subject: `Booked: ${what(o.m)} with ${o.candidate}, ${o.when}`,
    html:
      hi(o.name) +
      p(`<strong>${esc(o.candidate)}</strong> picked a time for your ${what(o.m)}.`) +
      big(esc(o.when)) +
      p(o.how) +
      (o.m.kind === "call"
        ? box("<strong>Good first questions:</strong> What kind of work gives you energy? What are you looking for next? What would you like to know about us?")
        : box(`Use the <a href="${siteUrl()}/hiring-help/templates/interview-scorecard" style="color:#17213a">interview scorecard</a> to keep it fair and easy to decide.`)) +
      quiet("It's in the calendar invite attached."),
  }),

  needOtherTimes: (o: { name: string | null; candidate: string; candidateId: string; note: string | null; phone: string | null }): Mail => ({
    audience: "owner",
    subject: `${first(o.candidate)} needs different times`,
    html:
      hi(o.name) +
      p(`${esc(first(o.candidate))} would like to talk, but those times don't work.`) +
      (o.note ? quote(o.note) : "") +
      button(`${siteUrl()}/candidates/${o.candidateId}#next`, "Offer new times") +
      quiet(`Or call ${esc(first(o.candidate))}${o.phone ? ` at ${esc(o.phone)}` : ""} to set it up.`),
  }),

  candidateDeclined: (o: { name: string | null; candidate: string }): Mail => ({
    audience: "owner",
    subject: `An update on ${o.candidate}`,
    html:
      hi(o.name) +
      p(`${esc(first(o.candidate))} has decided not to move forward. Nothing is charged, and you owe nothing for ${esc(first(o.candidate))}.`) +
      p("There are other strong candidates in the collection. We're happy to point you to the best fits.") +
      button(`${siteUrl()}/candidates`, "See other candidates"),
  }),

  askFeedback: (o: { name: string | null; candidate: string; candidateId: string; m: MeetingInfo }): Mail => ({
    audience: "owner",
    subject: `How was your ${what(o.m)} with ${first(o.candidate)}?`,
    html:
      hi(o.name) +
      p(`How did it go with <strong>${esc(o.candidate)}</strong>? One tap tells us, and we'll line up the next step: ${o.m.kind === "call" ? "a proper meeting" : "hire, meet again or check references"}.`) +
      button(`${siteUrl()}/candidates/${o.candidateId}#next`, "Tell us how it went"),
  }),

  feedbackNudge: (o: { name: string | null; candidate: string; candidateId: string; m: MeetingInfo }): Mail => ({
    audience: "owner",
    subject: `Still deciding about ${first(o.candidate)}?`,
    html:
      hi(o.name) +
      p(`Checking in after your ${what(o.m)} with ${esc(o.candidate)}. Keep going, or not a fit? Either answer helps ${esc(first(o.candidate))} know where they stand.`) +
      button(`${siteUrl()}/candidates/${o.candidateId}#next`, "Let us know"),
  }),

  candidateKeepGoing: (o: { name: string | null; candidate: string; candidateId: string; m: MeetingInfo }): Mail => ({
    audience: "owner",
    subject: `${first(o.candidate)} would like to keep going`,
    html:
      hi(o.name) +
      p(`Good news: <strong>${esc(o.candidate)}</strong> enjoyed the ${what(o.m)} and would like to keep going.`) +
      button(`${siteUrl()}/candidates/${o.candidateId}#next`, "See the next step"),
  }),

  references: (o: { name: string | null; candidate: string; candidateId: string; refs: { name: string; relation: string; phone: string; email: string }[] }): Mail => ({
    audience: "owner",
    subject: `${o.candidate}'s references`,
    html:
      hi(o.name) +
      p(`${esc(o.candidate)} sent their references:`) +
      list(o.refs.map((r) => `<strong>${esc(r.name)}</strong>${r.relation ? `, ${esc(r.relation)}` : ""}<br>${[r.phone, r.email].filter(Boolean).map(esc).join(" · ")}`)) +
      p(`Not sure what to ask? <a href="${siteUrl()}/hiring-help/articles/reference-checks" style="color:#17213a">Our 3-minute guide</a> has the questions.`) +
      button(`${siteUrl()}/candidates/${o.candidateId}#next`, "See the next step"),
  }),
};

// ============================== CANDIDATES ==============================

const myPage = (link?: string) => link ?? `${candidateUrl()}/me`;

export const candidate = {
  pageLink: (o: { name: string; link: string }): Mail => ({
    audience: "candidate",
    subject: "Your candidate page",
    html:
      hi(o.name) +
      p("Here's the link to your candidate page. It shows where things stand, how employers see your profile, and how to reach your rep.") +
      button(o.link, "Open my page") +
      quiet("The link works once and expires in an hour. After that you'll stay signed in on this device."),
  }),

  reachOutThanks: (o: { name: string }): Mail => ({
    audience: "candidate",
    subject: `Thanks, ${first(o.name)}. We'll call you soon`,
    html:
      hi(o.name) +
      p("Thanks for becoming a candidate with us. Someone from our team will reach out within one business day to find a time to talk."),
  }),

  onboardingBooked: (o: { name: string; rep: string; when: string; link: string | null; manage: string }): Mail => ({
    audience: "candidate",
    subject: `You're booked: ${o.when}`,
    html:
      hi(o.name) +
      p(`Welcome, and thank you for becoming a candidate with us. You're all set for a relaxed 45-minute video call with <strong>${esc(o.rep)}</strong>:`) +
      big(esc(o.when)) +
      (o.link ? button(o.link, "Join the video call") : p("We'll email you the video link before the call.")) +
      p("We'll talk about what you're good at, what you enjoy, and the kind of role where you'd shine. No preparation needed.") +
      box("<strong>Optional, but it helps:</strong> take the Working Genius assessment before we talk. It takes about 10 minutes and shows the kind of work that gives you energy.") +
      quiet(`Need a different time? <a href="${o.manage}" style="color:#5b667e">Reschedule or cancel here</a>.`),
  }),

  onboardingCancelled: (o: { name: string; when: string; rebook: string }): Mail => ({
    audience: "candidate",
    subject: "Your call is cancelled",
    html: hi(o.name) + p(`Your call on <strong>${esc(o.when)}</strong> is cancelled. Whenever you're ready, pick a new time.`) + button(o.rebook, "Pick a new time"),
  }),

  introStarted: (o: { name: string; company: string; contact: string | null; link: string }): Mail => ({
    audience: "candidate",
    subject: `Good news: ${o.company} would like to meet you`,
    html:
      hi(o.name) +
      p(`An employer read your candidate profile and wants to meet you: <strong>${esc(o.company)}</strong>${o.contact ? ` (${esc(o.contact)})` : ""}.`) +
      p("They'll suggest a few times for a short first call, and we'll email you as soon as they do. You're always free to say no.") +
      button(myPage(o.link), "See your page"),
  }),

  timesOffered: (o: { name: string; company: string; m: MeetingInfo; times: string[]; link: string }): Mail => ({
    audience: "candidate",
    subject: `${o.company} suggested times for a ${what(o.m)}`,
    html:
      hi(o.name) +
      p(`<strong>${esc(o.company)}</strong> would like ${o.m.kind === "call" ? "a short first call" : "to meet you"} (${o.m.minutes} minutes, ${MODE[o.m.mode]}${o.m.mode === "in_person" && o.m.place ? ` at ${esc(o.m.place)}` : ""}). Pick the time that suits you:`) +
      list(o.times.map(esc)) +
      (o.m.note ? quote(o.m.note) : "") +
      button(myPage(o.link), "Pick a time") +
      quiet("None of these work? Say so on the same page and they'll offer new ones."),
  }),

  booked: (o: { name: string; company: string; when: string; how: string; m: MeetingInfo; link: string }): Mail => ({
    audience: "candidate",
    subject: `You're booked with ${o.company}: ${o.when}`,
    html:
      hi(o.name) +
      p(`You're all set for your ${what(o.m)} with <strong>${esc(o.company)}</strong>:`) +
      big(esc(o.when)) +
      p(o.how) +
      box(`Be yourself and talk about the work you enjoy. That's what makes a great match. Our 4-minute guide <a href="${candidateUrl()}/join/help/get-ready-for-an-interview" style="color:#17213a">Getting ready for an interview</a> can help.`) +
      quiet("It's in the calendar invite attached."),
  }),

  askFeedback: (o: { name: string; company: string; m: MeetingInfo; link: string }): Mail => ({
    audience: "candidate",
    subject: `How was it with ${o.company}?`,
    html:
      hi(o.name) +
      p(`How did your ${what(o.m)} with <strong>${esc(o.company)}</strong> go? Let us know if you'd like to keep going. It takes one tap, and only we see your answer.`) +
      button(myPage(o.link), "Tell us how it went"),
  }),

  pickNudge: (o: { name: string; company: string; m: MeetingInfo; link: string }): Mail => ({
    audience: "candidate",
    subject: `${o.company} is waiting to hear from you`,
    html:
      hi(o.name) +
      p(`<strong>${esc(o.company)}</strong> offered times for a ${what(o.m)}. Pick one, ask for other times, or let them know it's not for you. Any answer is fine.`) +
      button(myPage(o.link), "Answer now"),
  }),

  refsRequested: (o: { name: string; company: string; note: string | null; link: string }): Mail => ({
    audience: "candidate",
    subject: `${o.company} asked for your references`,
    html:
      hi(o.name) +
      p(`Great sign: <strong>${esc(o.company)}</strong> would like to speak with two or three people you've worked with. A former manager is best.`) +
      (o.note ? quote(o.note) : "") +
      p("Give them a quick heads-up that they may get a call.") +
      button(myPage(o.link), "Add your references"),
  }),

  refsNudge: (o: { name: string; company: string; link: string }): Mail => ({
    audience: "candidate",
    subject: `Your references for ${o.company}`,
    html: hi(o.name) + p(`${esc(o.company)} is waiting on your references. Two or three people is plenty.`) + button(myPage(o.link), "Add your references"),
  }),

  ownerPassed: (o: { name: string; company: string; link: string }): Mail => ({
    audience: "candidate",
    subject: `An update from ${o.company}`,
    html:
      hi(o.name) +
      p(`${esc(o.company)} has decided to go a different direction. That's part of finding the right fit, and it says nothing about what you're worth.`) +
      p("You're still a candidate with us, other employers are browsing, and we're in your corner. If you'd like to talk it through, just reply.") +
      button(myPage(o.link), "See your page"),
  }),
};

export const backOffice = (path = "/admin") => `${teamUrl()}${path}`;

// ================================ TEAM ================================

export const team = {
  onboardingPackage: (o: { name: string; terms: string; note: string | null; setPasswordLink: string; isAdmin: boolean }): Mail => ({
    audience: "team",
    subject: `Welcome to ${brandName()}, ${first(o.name)}: how to start`,
    html:
      hi(o.name) +
      p(`Welcome to the team. Before anything else: this work is about people. You're here because you care about candidates and want to help them find work that truly fits them. That comes first, always. The site guides clients for you, so your time and warmth go to candidates.`) +
      box(
        `<strong>Your terms</strong><br>` +
          (o.isAdmin ? "Admin access to the back office." : `Commission: <strong>${esc(o.terms)}</strong>, paid within 30 days after we collect the fee and the candidate starts work.<br>Independent contractor. Candidates never pay anything.`) +
          (o.note ? `<br>${esc(o.note)}` : ""),
      ) +
      `<p style="margin:0 0 8px;font-weight:700">How to start (about 20 minutes)</p>` +
      `<ol style="margin:0 0 16px;padding-left:20px">
<li style="margin:6px 0"><strong>Set your password</strong> with the button below.</li>
${o.isAdmin ? "" : '<li style="margin:6px 0"><strong>Sign your rep agreement.</strong> It opens when you first sign in, one page, about three minutes.</li>'}
<li style="margin:6px 0"><strong>Set your hours</strong> and paste your Google Meet or Zoom link on <a href="${teamUrl()}/admin/hours" style="color:#17213a">My hours</a>. Candidates can then book calls with you.</li>
<li style="margin:6px 0"><strong>Read the <a href="${teamUrl()}/admin/guide" style="color:#17213a">rep guide</a></strong>. Three minutes, everything you do.</li>
<li style="margin:6px 0"><strong>Take your first call.</strong> Know someone looking for work? Add them yourself with <a href="${teamUrl()}/admin/candidates/new" style="color:#17213a">+ Add candidate</a>.</li>
</ol>` +
      button(o.setPasswordLink, "Set your password") +
      quiet(`The button works once, for 7 days. After that, sign in at ${esc(teamUrl().replace(/^https?:\/\//, ""))} with your email and password. Questions? Text Heshy at ${esc(contactPhone())}.`),
  }),
};
