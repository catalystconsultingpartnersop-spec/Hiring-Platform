// The rep invitation: a two-page PDF Heshy sends to someone he'd like as a rep.
// Every line is editable from /admin/invite. "{name}" becomes the rep's first name.

export type Item = { t: string; d: string };
export type Profile = { role: string; headline: string; strengths: string; years: string };

export type Invite = {
  from: string;
  headline: string;
  lede: string;
  thesisA: string;
  thesisB: string;
  candidateSteps: Item[];
  profiles: Profile[];
  ownerSteps: Item[];
  caption: string;
  candidatesLove: Item[];
  ownersLove: Item[];
  youTitle: string;
  you: Item[];
  qualities: string[];
  qualitiesFooter: string;
  closeTitle: string;
  closeText: string;
  signature: string;
};

export const DEFAULT_INVITE: Invite = {
  from: "A personal note from Heshy",
  headline: "{name}, I’ve been thinking about you.",
  lede: "I’m building something I believe in, and you’re one of the first people I want in it. Here’s the whole idea.",
  thesisA: "We work with candidates, for candidates.",
  thesisB: "Then we open the door for owners to browse that vetted talent.",
  candidateSteps: [
    { t: "Someone looking for work", d: "A friend, a neighbor, someone in your world." },
    { t: "Sits down with a rep", d: "A real 45-minute conversation. Someone finally listens." },
    { t: "Discovers what they’re great at", d: "Their natural strengths, and the careers they’d shine in." },
    { t: "Becomes a candidate", d: "Vetted, with a profile that shows how they shine." },
  ],
  profiles: [
    { role: "Executive assistant", headline: "Runs a busy week like clockwork", strengths: "Helping others, Finishing the job", years: "8 yrs" },
    { role: "Sales", headline: "Never lets a lead go cold", strengths: "Rallying people, Coming up with ideas", years: "6 yrs" },
    { role: "Bookkeeping", headline: "Finds the mistake everyone else missed", strengths: "Judging what works, Finishing the job", years: "5 yrs" },
    { role: "Dispatch", headline: "Keeps every crew on schedule", strengths: "Rallying people, Helping others", years: "3 yrs" },
  ],
  ownerSteps: [
    { t: "Browses vetted people", d: "No job post. No pile of resumes." },
    { t: "Finds the right fit", d: "Sees strengths, experience and pay range at a glance." },
    { t: "Unlocks to meet them", d: "Signs once, card on file. Nothing charged yet." },
    { t: "Hires", d: "One flat fee, only when it works out." },
  ],
  caption: "The candidate always comes first. The owner gets someone who was chosen with care.",
  candidatesLove: [
    { t: "Someone actually listens", d: "A real conversation about who they are, not a keyword filter." },
    { t: "They see their own strengths", d: "Many people walk away knowing what they’re great at for the first time." },
    { t: "Private and free, always", d: "Their name stays hidden until an owner signs to meet them. They never pay." },
    { t: "They always know where they stand", d: "Their own page shows who looked and who wants to meet." },
  ],
  ownersLove: [
    { t: "Every candidate is already vetted", d: "A real person sat with each one. The screening is done before they look." },
    { t: "They see the fit, not a stack of resumes", d: "Strengths, experience and pay range on one card. They can tell in a minute." },
    { t: "No posting, no waiting", d: "Good people are ready to browse today." },
    { t: "No risk", d: "Nothing to pay until they hire. Then one flat fee." },
  ],
  youTitle: "Where you come in.",
  you: [
    { t: "", d: "You know people. People trust you. Someone in your world needs a job right now and doesn’t know what they’re best at." },
    {
      t: "Your job is the candidate.",
      d: "You sit with people who need work, get to know them, and vet them. Then you give your opinion: which career would this person thrive in? That judgment is what makes the collection worth browsing.",
    },
    { t: "You don’t chase job openings or business owners.", d: "The site brings the owners. Your time goes to the people." },
    {
      t: "Adding a candidate is easy.",
      d: "Upload their resume and most of the profile fills itself in. The site suggests words for the rest.",
    },
    { t: "Full onboarding whenever you want it.", d: "When you’re ready, we walk you through everything, step by step." },
    {
      t: "Keep your day job or your primary career.",
      d: "This fits around it, and there’s an opportunity for significant income. When one of your candidates gets hired, you earn.",
    },
  ],
  qualities: [
    "Smart, intuitive people",
    "Successful and active in the workforce",
    "Plugged in, with people who trust them",
    "Love people and want to help them",
    "Communicate well and follow up",
  ],
  qualitiesFooter: "That’s you, {name}.",
  closeTitle: "I want you on board.",
  closeText: "Every person is built for something. I’d love for you to help them find it. Text me back and let’s grab 20 minutes this week.",
  signature: "Heshy",
};

const str = (v: unknown, max = 600) => (typeof v === "string" ? v.slice(0, max) : null);

function items(v: unknown, fallback: Item[], maxLen = 12): Item[] {
  if (!Array.isArray(v)) return fallback;
  return v.slice(0, maxLen).map((x) => ({ t: str(x?.t, 200) ?? "", d: str(x?.d) ?? "" }));
}

// Takes anything (saved setting, request body) and returns a complete, safe invite.
export function cleanInvite(raw: unknown): Invite {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_INVITE;
  const profiles = Array.isArray(r.profiles)
    ? r.profiles.slice(0, 6).map((x: Record<string, unknown>) => ({
        role: str(x?.role, 60) ?? "",
        headline: str(x?.headline, 120) ?? "",
        strengths: str(x?.strengths, 120) ?? "",
        years: str(x?.years, 20) ?? "",
      }))
    : d.profiles;
  return {
    from: str(r.from, 120) ?? d.from,
    headline: str(r.headline, 160) ?? d.headline,
    lede: str(r.lede) ?? d.lede,
    thesisA: str(r.thesisA, 200) ?? d.thesisA,
    thesisB: str(r.thesisB, 200) ?? d.thesisB,
    candidateSteps: items(r.candidateSteps, d.candidateSteps, 6),
    profiles,
    ownerSteps: items(r.ownerSteps, d.ownerSteps, 6),
    caption: str(r.caption) ?? d.caption,
    candidatesLove: items(r.candidatesLove, d.candidatesLove, 8),
    ownersLove: items(r.ownersLove, d.ownersLove, 8),
    youTitle: str(r.youTitle, 120) ?? d.youTitle,
    you: items(r.you, d.you, 10),
    qualities: Array.isArray(r.qualities) ? r.qualities.slice(0, 10).map((q) => str(q, 120) ?? "") : d.qualities,
    qualitiesFooter: str(r.qualitiesFooter, 120) ?? d.qualitiesFooter,
    closeTitle: str(r.closeTitle, 120) ?? d.closeTitle,
    closeText: str(r.closeText) ?? d.closeText,
    signature: str(r.signature, 60) ?? d.signature,
  };
}

export function fillName(s: string, name: string) {
  const first = name.trim().split(/\s+/)[0] || "Friend";
  return s.replaceAll("{name}", first);
}
