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

// "browse" goes straight to the candidates; "why" is the story page.
export function shareLink(ref?: string | null, to: "browse" | "why" = "browse") {
  const r = ref ? refSlug(ref) : "";
  return `${siteUrl()}/${to === "browse" ? "candidates" : "why"}${r ? `?r=${r}` : ""}`;
}

export function ownerMessage(ref?: string | null) {
  return `If hiring has ever felt like more work than it should be, this is for you.\n\nBrowse candidates: ${shareLink(ref, "browse")}\n\nWhy we built it: ${shareLink(ref, "why")}`;
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
