import { cookies } from "next/headers";
import { db } from "./db";
import { siteUrl } from "./format";

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
