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
  return `Dear business owner,\n\nIs hiring a hassle? Tired of the calls, meetings and questions before you even meet a candidate? Tired of being told how to run your business? Tired of high fees, then wondering for 60 days if the hire will work out?\n\nThere's a better way. It's your business. You know who you need. Browse, scroll, and pick the person who fits.\n\nEvery candidate was met and coached, so they know the role they belong in. They know what they're looking for. So do you. That's a setup for success.\n\n${link}`;
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
