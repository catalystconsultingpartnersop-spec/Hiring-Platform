// Short, practical hiring advice for owners. Same light markup as the
// templates: "## " heading, "- " bullet, blank line between paragraphs.

export type Article = { slug: string; title: string; blurb: string; minutes: number; body: string; related?: string[] };

export const ARTICLES: Article[] = [
  {
    slug: "make-an-offer-they-accept",
    title: "How to make an offer they'll say yes to",
    blurb: "Speed, clarity and one phone call do more than an extra few thousand dollars.",
    minutes: 4,
    related: ["offer-letter"],
    body: `Good candidates rarely have just one option. The owners who win them aren't always the ones who pay the most. They're the ones who move quickly and make saying yes easy.

## Move within 48 hours
Once you know, act. Every day you wait, the candidate wonders whether you're sure, and other employers get a chance to step in. If you need a few days, tell them when they'll hear from you, and keep that promise.

## Call first, then put it in writing
Make the offer by phone. You'll hear their reaction, answer questions on the spot, and show you're genuinely excited. Then send the written offer letter the same day, so the details are clear and nothing gets lost.

## Know your numbers before you call
Decide your pay range in advance, including the most you're willing to go to. If they ask for more, you can answer calmly instead of improvising. Many states, including New York, also require pay ranges in job postings, so keep your offer consistent with what you advertised.

## Sell the job, not just the salary
Remind them why this role fits them: the work they'll be good at, who they'll work with, how they can grow. The candidate profile shows what kind of work energizes them. Use it.

## Make the details concrete
Start date, schedule, who they report to, what the first week looks like. Uncertainty is what makes people hesitate.

## Handle a counteroffer before it happens
Ask: "If your current employer tries to keep you, how will you think about it?" It's a simple question that surfaces doubts early.

## Give a short, real deadline
Three to five business days is fair. Long deadlines invite shopping around.`,
  },
  {
    slug: "interview-with-strengths",
    title: "Interviewing for how someone works, not just what they've done",
    blurb: "Use the candidate's strengths profile to ask better questions and avoid a bad fit.",
    minutes: 5,
    related: ["interview-scorecard"],
    body: `Most hiring mistakes aren't about skills. They're about fit with the actual work: someone who loves big-picture thinking stuck in detailed follow-through, or the reverse. Every candidate on our site has been assessed for exactly this, so use it.

## Start with the work, not the job title
Before the interview, list what this person will really spend their days doing. Generating ideas? Spotting problems? Rallying people? Helping others? Pushing tasks over the finish line? Most roles lean heavily on two or three of these.

## Compare it to their profile
Each profile tells you what the candidate is naturally wired for. If the role is mostly what they're wired for, great. If it's mostly what drains them, they may do it well for a while, but they won't love it, and you'll feel that.

## Ask for stories, not opinions
"Are you organized?" gets a yes from everyone. Instead ask:
- "Tell me about a week where you had too much to do. How did you decide what came first?"
- "What part of your last job did you look forward to? What did you put off?"
- "Tell me about something you started that someone else finished, or the other way around."

## Score everyone the same way
Use the same questions and the same scorecard for every candidate, and fill it in before you talk it over with anyone. It makes the decision fairer and much easier.

## Ask what they need from you
"What does a great manager do for you?" Their answer tells you how to set them up to succeed.`,
  },
  {
    slug: "reference-checks",
    title: "Reference checks that actually tell you something",
    blurb: "Ten minutes on the phone can save you months of trouble.",
    minutes: 3,
    related: ["reference-check"],
    body: `Most owners skip references or treat them as a formality. Done well, they're one of the best predictors you have.

## Call, don't email
People write polite emails. On the phone, you hear the pauses.

## Talk to a former manager
Peers and friends are kind. A manager who actually supervised them knows how they work under pressure.

## Ask the one question that matters
"If you could hire them again, would you?" Listen to how fast and how warmly they answer. "Absolutely" and "sure, they were fine" mean very different things.

## Ask how to manage them
"What should I know to help them do their best work?" References relax with this question and often share the most useful insight of the call.

## Watch for patterns, not one comment
One lukewarm reference isn't a verdict. The same concern from two people is worth taking seriously.

## Respect the law
Stick to job-related questions. Don't ask about health, family plans, age, religion or anything similar.`,
  },
  {
    slug: "new-hire-paperwork",
    title: "The new-hire paperwork checklist",
    blurb: "What to have ready before day one so nothing falls through the cracks.",
    minutes: 4,
    related: ["offer-letter", "nda", "first-90-days"],
    body: `Getting the paperwork right protects you and gets your new hire paid on time. Here's the usual list for a W-2 employee in the US. Your payroll provider or accountant can confirm the details for your state.

## Federal
- Form I-9: confirms they're allowed to work in the US. They complete their part by their first day, and you review their documents within three business days of their start date.
- Form W-4: their federal tax withholding.
- New-hire reporting: employers must report new hires to their state, generally within 20 days. Most payroll providers do this for you.

## State
- State withholding form, where your state has one.
- Required notices. In New York, for example, employers must give new hires a written notice of their pay rate and payday.
- Workers' compensation coverage, and in some states, disability and paid family leave coverage.

## Your own documents
- Signed offer letter.
- Confidentiality agreement, if they'll see customer or pricing information.
- Your handbook or a short "how we work" note.
- Direct deposit and emergency contact details.

## Before day one
Set up their email, tools and logins, and plan their first week. A smooth first day tells people they made the right choice.`,
  },
  {
    slug: "employee-or-contractor",
    title: "Employee or contractor? Getting it right",
    blurb: "The label on the paperwork doesn't decide it. How the work is done does.",
    minutes: 4,
    related: ["contractor-agreement", "offer-letter"],
    body: `Hiring someone as a contractor can seem simpler: no payroll taxes, no benefits. But if the government decides they were really an employee, you can owe back taxes, penalties and unpaid overtime.

## The basic question
Do you control how, when and where the work is done? If yes, they're probably an employee.

## Signs of an employee
- You set their hours and tell them how to do the job.
- They work mainly or only for you, on an ongoing basis.
- You provide the tools, equipment and workspace.
- The work is a core, everyday part of your business.

## Signs of a real contractor
- They run their own business, with other clients.
- They decide how to do the work and use their own tools.
- They're hired for a defined project or result.
- They invoice you and carry their own insurance.

## Some states are stricter
New Jersey, for example, uses a tough "ABC" test for many purposes: a worker is an employee unless the business can show all three conditions, including that the work is outside its usual course of business or places. When in doubt, hire as an employee or ask your accountant.

## If it's a contractor
Use a written agreement that matches reality, collect a Form W-9, and issue a Form 1099 where required.`,
  },
  {
    slug: "first-week",
    title: "The first week: set your new hire up to win",
    blurb: "Most people decide whether they'll stay within their first few weeks.",
    minutes: 3,
    related: ["first-90-days"],
    body: `You've done the hard part. Now make sure it sticks. People form a lasting impression of a job in the first few weeks, and a messy start is one of the most common reasons good hires leave early.

## Be ready before they arrive
Desk, equipment, logins and a schedule for the week. Nothing says "we weren't expecting you" like waiting around on day one.

## Introduce them properly
Tell the team who's starting and why you're excited. Arrange a team lunch or coffee in the first week.

## Give them a real win early
One small, real task they can finish in the first few days builds confidence fast.

## Make success visible
Walk through a simple 30-60-90 day plan, so they know what good looks like and when.

## Check in more than you think you need to
A 15-minute conversation at the end of the first few days, then weekly. Ask what's confusing and what they need. Small problems are easy to fix early.

## Play to their strengths
You know from their profile what kind of work energizes them. Give them some of it early, and they'll show you what they can do.`,
  },
];

export function getArticle(slug: string) {
  return ARTICLES.find((a) => a.slug === slug) ?? null;
}
