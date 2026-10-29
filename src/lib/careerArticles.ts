import type { Article } from "./articles";

// Career help for people looking for work. Same light markup as the
// owners' articles: "## " heading, "- " bullet, blank line between paragraphs.

export const CAREER_ARTICLES: Article[] = [
  {
    slug: "not-sure-what-you-want",
    title: "Not sure what you want? Start here.",
    blurb: "You don't need a five-year plan. You need to notice what gives you energy.",
    minutes: 3,
    body: `Lots of people come to us without a clear answer to "what kind of job do you want?" That's normal, and it's a fine place to start.

## Look at energy, not titles
Job titles are a poor guide. Instead, think about your days. Which parts of your last job did you look forward to? Which parts did you keep putting off? The work that gives you energy is a better compass than any title.

## Notice what people come to you for
Do friends ask you to plan the trip, fix the spreadsheet, talk them through a decision, or cheer them on? What people rely on you for is usually a strength you take for granted.

## Try the six kinds of work
Most work is a mix of six things: dreaming up questions, coming up with ideas, judging what will work, rallying people, helping, and finishing. Most of us are naturally drawn to two of them. The Working Genius assessment takes about 10 minutes and puts words to yours.

## Then talk it through
That's what our call is for. You don't need to arrive with answers. We'll help you connect what you enjoy with the kinds of roles where it matters.`,
  },
  {
    slug: "talk-about-your-strengths",
    title: "Talking about your strengths without bragging",
    blurb: "A simple way to say what you're good at that feels honest and lands well.",
    minutes: 3,
    body: `Many people freeze when an interviewer asks, "What are your strengths?" It can feel like bragging. It isn't. Employers genuinely need to know where you'll shine.

## Use a small story
Instead of "I'm detail-oriented," try: "At my last job I noticed our invoices didn't match the delivery logs. I tracked it down and we recovered about two thousand dollars." A short, true story does the bragging for you.

## Name the energy, too
Tell them what kind of work you enjoy, not just what you can do: "I love taking a messy process and making it run smoothly." People who enjoy their work tend to stay and do it well, and employers know it.

## Be honest about the other side
If asked about weaknesses, it's fine to say what drains you: "Long stretches of brainstorming wear me out. I'm at my best once there's a plan to carry out." That's self-awareness, and it helps you land in the right role.

## Practice out loud
Say your two or three stories out loud a few times before the interview. They'll come out naturally when it counts.`,
  },
  {
    slug: "get-ready-for-an-interview",
    title: "Getting ready for an interview",
    blurb: "An hour of the right preparation beats a night of worrying.",
    minutes: 4,
    body: `You don't need to memorize answers. You need to walk in knowing a little about them, a little about yourself, and what you want to ask.

## Learn the basics about them
Spend 20 minutes on their website and any reviews or news. What do they sell or do? Who are their customers? What might be hard about this job?

## Prepare three stories
Pick three moments from your work or life that show how you work: a problem you solved, a time you helped someone, something you finished under pressure. Most interview questions can be answered with one of them.

## Prepare your questions
Good questions show you're serious and help you decide if the job fits you:
- "What does a great first three months look like in this role?"
- "What's the hardest part of this job?"
- "How does the team work together day to day?"

## The day of
Plan to arrive 10 minutes early, or test your video link the day before. Bring a copy of your resume. Turn your phone off.

## Afterward
Send a short thank-you email the same day. Mention one thing you enjoyed talking about. It's simple, and many people skip it.

## Tell us how it went
If the employer found you through us, let your rep know how it went. We can often help on both sides.`,
  },
  {
    slug: "weigh-a-job-offer",
    title: "How to weigh a job offer",
    blurb: "Pay matters. So do the people, the work and the hours. Here's how to look at all of it.",
    minutes: 4,
    body: `Getting an offer is exciting. Before you say yes, take a day to make sure it's the right yes.

## Get it in writing
Ask for the offer in writing: pay, schedule, start date, who you'll report to and any benefits. It's a normal request and protects everyone.

## Look at the whole picture
- Pay, and how often you're paid.
- Hours, schedule and commute, or how much is remote.
- Health insurance, paid time off and other benefits.
- The work itself: will you spend most of your days on things that give you energy?
- The people: did you like the person you'd work for?

## It's OK to ask for more, politely
If the pay is below what you hoped, it's fine to ask once, kindly, with a reason: "I'm excited about this role. Based on my experience with X, I was hoping for closer to Y. Is there any flexibility?" The worst answer is usually "no," and the offer still stands.

## Don't leave them hanging
Ask how long you have to decide, and answer by then. If you're waiting on another offer, it's fine to say so.

## If you accept through us
Let your rep know. We love hearing good news, and it helps us take your profile down so other employers don't reach out.`,
  },
  {
    slug: "your-first-weeks",
    title: "Your first weeks in a new job",
    blurb: "How to settle in, earn trust quickly and set yourself up to stay.",
    minutes: 3,
    body: `The first few weeks shape how a new job feels for a long time. A few small habits make a big difference.

## Ask what success looks like
In your first week, ask your manager: "What would make my first 90 days a success in your eyes?" Write it down. Check in on it every few weeks.

## Learn names and ask questions
Everyone expects a new person to ask questions. Asking early is a strength, not a weakness. Keep a notebook so you only ask each one once.

## Get one early win
Find a small, real task you can finish well in your first days. It builds confidence on both sides.

## Lean into your strengths
You know what kind of work gives you energy. Look for chances to do more of it, and let your manager know where you feel strongest.

## Speak up early if something feels off
If the job is different from what you expected, raise it kindly and early. Small mismatches are easy to fix in week two and much harder in month six.`,
  },
];

export function getCareerArticle(slug: string) {
  return CAREER_ARTICLES.find((a) => a.slug === slug) ?? null;
}
