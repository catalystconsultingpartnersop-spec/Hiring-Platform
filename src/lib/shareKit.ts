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

export function shareLink(ref?: string | null) {
  const r = ref ? refSlug(ref) : "";
  return `${siteUrl()}/${r ? `?r=${r}` : ""}`;
}

export function ownerMessage(link: string) {
  return `Business owner? You built your business. You don't need anyone telling you how to run it, who to hire, or why.\n\nBrowse candidates we've already vetted in person. See exactly what each one brings. Pick the one you want and hire them. That's it.\n\nFree to browse. One flat fee, only if you hire.\n${link}`;
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
