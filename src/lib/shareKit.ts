import { cookies } from "next/headers";
import { db } from "./db";
import { candidateUrl, siteUrl } from "./format";

// The owner share kit: one short message, one graphic, one link.
export const REF_COOKIE = "tcc_ref";

export function refSlug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

// "home" is our homepage; "why" is the story page.
export function shareLink(ref?: string | null, to: "home" | "why" = "home") {
  const r = ref ? refSlug(ref) : "";
  return `${siteUrl()}/${to === "home" ? "" : "why"}${r ? `?r=${r}` : ""}`;
}

export function ownerMessage(ref?: string | null) {
  return `If hiring has ever felt like more work than it should be, this is for you.\n\nSee how it works: ${shareLink(ref, "home")}`;
}

// The teaser: the question, the half-hour promise, what you get. One link.
export function ownerTeaser(ref?: string | null) {
  return `Unimpressed with your hiring options?\n\nTell us the position you're hiring for. Half an hour later, you can have a qualified candidate to consider.\n\nPre-vetted candidates who fit your position and your needs.\n\nSee how: ${shareLink(ref, "home")}`;
}

// The "new concept" family: one message for each poster, so the caption says
// what the picture says.
const concept = (ref: string | null | undefined, middle: string) =>
  `Looking to hire? A new concept in hiring.\n\nPre-vetted candidates. Handpicked by you.\n\n${middle}\n\nOne flat fee. No hefty recruiter commissions.\n\nFind out more: ${shareLink(ref, "home")}`;
const HALF_HOUR = "Tell us the position you're hiring for. Half an hour later, you can have a qualified candidate to consider.";

// "A new concept in hiring": for owners who'd rather browse than be called.
export function ownerConcept(ref?: string | null) {
  return `A new concept in hiring.\n\nPre-vetted talent. Handpicked by you.\n\nBrowse profiles of experienced, pre-screened candidates, ready for their next opportunity.\n\nOne flat fee. No hefty recruiter commissions.\n\nSee for yourself: ${shareLink(ref, "home")}`;
}

// The earlier teaser, kept as a choice.
export function ownerRevolutionary(ref?: string | null) {
  return `Unimpressed with your hiring options? We built a revolutionary way to hire.\n\nTell us the position you're hiring for. Half an hour later, you can have a qualified candidate to consider.\n\nSee how: ${shareLink(ref, "home")}`;
}

// Everything in the share kit, in the order people see it. To add a poster:
// put name.png and name-status.png in public/share and add a line here.
export type Kit = { id: string; name: string; tag?: string; about: string; image: string; message: string; link: string };

export function ownerKits(ref?: string | null): Kit[] {
  const link = shareLink(ref);
  return [
    { id: "four-reasons", name: "Four reasons", tag: "New", about: "Everything we do, as a short list.", image: "/share/owner-four-reasons.png", message: concept(ref, "Tell us the position, and half an hour later you can have a qualified candidate to consider."), link },
    { id: "concept-short", name: "Short and clear", tag: "New", about: "The whole offer in the fewest words.", image: "/share/owner-concept-short.png", message: concept(ref, "Tell us the position. A qualified candidate to consider, in half an hour."), link },
    { id: "handpicked", name: "Handpicked by you", tag: "New", about: "For owners who want to stay in charge of who they meet.", image: "/share/owner-handpicked.png", message: concept(ref, HALF_HOUR), link },
    { id: "concept-half-hour", name: "The half-hour promise", tag: "New", about: "The half-hour sentence in full.", image: "/share/owner-concept-half-hour.png", message: concept(ref, HALF_HOUR), link },
    { id: "concept-talk-browse", name: "Talk or browse", tag: "New", about: "Tell us the position, or browse the candidates yourself.", image: "/share/owner-concept-talk-browse.png", message: concept(ref, "We've already met the candidates. Tell us the position you're hiring for, or browse them yourself."), link },
    { id: "half-hour", name: "Half an hour", tag: "Shloimy recommends", about: "The promise: a candidate to consider in half an hour.", image: "/share/owner-teaser.png", message: ownerTeaser(ref), link },
    { id: "concept-words", name: "A new concept (browse)", about: "For owners who like to browse and pick for themselves. Words only.", image: "/share/owner-concept-words.png", message: ownerConcept(ref), link },
    { id: "concept", name: "A new concept, with profiles", about: "The same words, with three sample profile cards.", image: "/share/owner-concept.png", message: ownerConcept(ref), link },
    { id: "revolutionary", name: "A revolutionary way", about: "The first teaser.", image: "/share/owner-revolutionary.png", message: ownerRevolutionary(ref), link },
    { id: "letter", name: "The letter", about: "Speaks to what owners find frustrating.", image: "/share/owner-card.png", message: ownerMessage(ref), link },
  ];
}

export function candidateKits(ref?: string | null): Kit[] {
  return [{ id: "candidate", name: "Looking for work?", about: "For someone looking for their next move.", image: "/share/candidate-card.png", message: candidateMessage(ref), link: candidateLink(ref) }];
}

// The candidate side: a warm note from a rep to their network.
export function candidateLink(ref?: string | null) {
  const r = ref ? refSlug(ref) : "";
  return `${candidateUrl()}/join${r ? `?r=${r}` : ""}`;
}

export function candidateMessage(ref?: string | null) {
  return `Looking for work, or know someone who is? Everyone has a talent. We sit down with you, help you discover yours and the role it belongs in, then put you in front of business owners looking for exactly that. It doesn't cost you a thing, and it's completely private.\n\n${candidateLink(ref)}`;
}

// A new candidate who came through a rep's link: that rep brought them in.
export async function referringRep(): Promise<string | null> {
  try {
    const ref = refSlug((await cookies()).get(REF_COOKIE)?.value ?? "");
    if (!ref) return null;
    const { data } = await db().from("staff").select("id, full_name, email, active").eq("active", true);
    const match = (data ?? []).find((s) => refSlug(((s.full_name as string | null) ?? (s.email as string)).split(" ")[0]) === ref);
    return (match?.id as string) ?? null;
  } catch {
    return null;
  }
}

// A new owner who came through someone's link: remember who sent them.
export async function tagReferral(ownerId: string) {
  try {
    const ref = refSlug((await cookies()).get(REF_COOKIE)?.value ?? "");
    if (!ref) return;
    // A referral partner who's been turned off no longer earns on new owners.
    const { allReferrers } = await import("./referrers");
    if ((await allReferrers())[ref]?.off) return;
    await db().from("owners").update({ referred_by: ref }).eq("id", ownerId).is("referred_by", null);
  } catch {
    /* never block sign-up over this */
  }
}

// Whose share link brought this visitor (the ?r= name, remembered for 90 days), or null.
export async function sentBy(): Promise<string | null> {
  try {
    return refSlug((await cookies()).get(REF_COOKIE)?.value ?? "") || null;
  } catch {
    return null;
  }
}

// Posters Heshy took off the shelf (they can be put back from the team share kit).
export async function hiddenPosters(): Promise<string[]> {
  try {
    const { getSetting } = await import("./settings");
    return await getSetting<string[]>("share_hidden", []);
  } catch {
    return [];
  }
}

// The shelf as people see it: removed posters left out, and Heshy's own labels
// in place of the built-in ones.
export async function shelf(kits: Kit[]): Promise<{ shown: Kit[]; removed: Kit[] }> {
  const hidden = await hiddenPosters();
  let labels: Record<string, string> = {};
  try {
    const { getSetting } = await import("./settings");
    labels = await getSetting<Record<string, string>>("share_labels", {});
  } catch {
    /* built-in labels */
  }
  const all = kits.map((k) => (k.id in labels ? { ...k, tag: labels[k.id] || undefined } : k));
  return { shown: all.filter((k) => !hidden.includes(k.id)), removed: all.filter((k) => hidden.includes(k.id)) };
}
