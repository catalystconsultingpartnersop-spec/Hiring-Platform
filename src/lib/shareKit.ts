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
  return `If hiring has ever felt like more work than it should be, this is for you.\n\nTake a look: ${shareLink(ref, "home")}\n\nWhy we built it: ${shareLink(ref, "why")}`;
}

// The candidate side: a warm note from a rep to their network.
export function candidateLink(ref?: string | null) {
  const r = ref ? refSlug(ref) : "";
  return `${candidateUrl()}/join${r ? `?r=${r}` : ""}`;
}

export function candidateMessage(ref?: string | null) {
  return `Looking for work, or know someone who is? Everyone has a talent. We sit down with you, help you discover yours and the role it belongs in, then put you in front of business owners looking for exactly that. It costs you nothing: the business owners cover our fee. And it's completely private.\n\n${candidateLink(ref)}`;
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
    await db().from("owners").update({ referred_by: ref }).eq("id", ownerId).is("referred_by", null);
  } catch {
    /* never block sign-up over this */
  }
}
