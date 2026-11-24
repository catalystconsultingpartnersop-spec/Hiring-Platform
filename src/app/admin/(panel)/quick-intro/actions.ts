"use server";

import { db, logActivity } from "@/lib/db";
import { escapeHtml, sendEmail } from "@/lib/email";
import { kit } from "@/lib/emailKit";
import { refCode, siteUrl } from "@/lib/format";
import { requireStaff } from "@/lib/session";
import { refSlug } from "@/lib/shareKit";
import { allow } from "@/lib/throttle";
import { clearCatalog } from "@/lib/catalog";
import { setPrivate } from "@/lib/privateCandidates";
import { candidateLinkTo, requestPromise } from "@/lib/promise";

export type QuickIntroResult = {
  error?: string;
  ok?: boolean;
  candidateId?: string;
  headline?: string;
  ownerLink?: string;
  ownerText?: string;
  ownerPhone?: string;
  ownerName?: string;
  candText?: string;
  candPhone?: string;
  candName?: string;
  emailedOwner?: boolean;
  emailedCandidate?: boolean;
  inBrowse?: boolean;
};

const first = (n: string) => n.trim().split(/\s+/)[0] || "";
const clip = (s: FormDataEntryValue | null, n: number) => String(s ?? "").trim().slice(0, n);
const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// Quick intro: a rep meets someone and introduces him to a business owner in under
// a minute. The site writes the profile from the rep's few words, lists him (in
// Browse or privately), and hands back two ready texts to send from the rep's own
// phone. The owner signs and puts a card on file before seeing his name, as always.
export async function quickIntro(_prev: QuickIntroResult, form: FormData): Promise<QuickIntroResult> {
  const me = await requireStaff();
  if (!(await allow(`quickintro:${me.id ?? me.email}`, 10, 60))) return { error: "That's a lot of intros in a few minutes. Try again shortly." };

  const candName = clip(form.get("cand_name"), 80);
  const candPhone = clip(form.get("cand_phone"), 30);
  const candEmail = clip(form.get("cand_email"), 120).toLowerCase();
  const about = clip(form.get("about"), 2000);
  const ownerName = clip(form.get("owner_name"), 120);
  const ownerPhone = clip(form.get("owner_phone"), 30);
  const ownerEmail = clip(form.get("owner_email"), 120).toLowerCase();
  const inBrowse = form.get("browse") === "on";

  if (!candName) return { error: "Add the candidate's name." };
  if (about.length < 8) return { error: "Add a sentence about what he's great at." };
  if (!ownerName) return { error: "Add who you're introducing him to." };
  if (candEmail && !emailOk(candEmail)) return { error: "The candidate's email doesn't look right." };
  if (ownerEmail && !emailOk(ownerEmail)) return { error: "The owner's email doesn't look right." };

  // Write the profile from the rep's words.
  const { draftFromResume } = await import("@/lib/resumeDraft");
  let d: Awaited<ReturnType<typeof draftFromResume>> | null = null;
  try {
    d = await draftFromResume(null, { repTake: about });
  } catch (e) {
    console.error("quick intro draft", e);
  }
  const now = new Date().toISOString();
  const record: Record<string, unknown> = {
    status: "listed",
    listed_at: now,
    full_name: candName,
    email: candEmail,
    phone: candPhone || null,
    role_category: d?.role_category || "Open to roles",
    also_roles: d?.also_roles ?? [],
    level: d?.level || null,
    industry: d?.industry || null,
    also_industries: d?.also_industries ?? [],
    languages: d?.languages ?? [],
    location_region: d?.location_region || null,
    headline: d?.headline || about.split(/[.!\n]/)[0].slice(0, 90),
    summary: d?.summary || about,
    highlights: d?.highlights ?? [],
    full_profile: d?.full_profile || null,
    admin_notes: `Quick intro by ${me.name} to ${ownerName}. In ${me.name.split(" ")[0]}'s words: ${about}`,
    application: { quick_intro: { by: me.email, to: ownerName, at: now } },
    updated_at: now,
    ...(me.id ? { added_by: me.id } : {}),
  };
  const { data, error } = await db().from("candidates").insert(record).select("id, headline").single();
  if (error || !data) return { error: `Couldn't save it: ${error?.message ?? "unknown error"}. Nothing was sent.` };
  const id = data.id as string;
  if (!inBrowse) await setPrivate(id, true);
  clearCatalog();

  const slug = refSlug(first(me.name) || me.email.split("@")[0]);
  const ownerLink = `${siteUrl()}/c/${refCode(id)}${slug ? `?r=${slug}` : ""}`;
  const headline = String(data.headline ?? "");
  const repFirst = first(me.name);
  const ownerText = `Hi ${first(ownerName)}, it's ${repFirst}. I met someone I think you'd want to meet: ${headline.charAt(0).toLowerCase() + headline.slice(1)}. Here's the profile: ${ownerLink}`;
  const agreement = candidateLinkTo(id, "promise");
  const candText = `Hi ${first(candName)}, it's ${repFirst}. I passed you along to ${ownerName}, who's hiring. Please take a minute to sign this, so we can share your details when they want to meet you: ${agreement}`;

  let emailedOwner = false;
  if (ownerEmail) {
    const r = await sendEmail({
      to: ownerEmail,
      audience: "owner",
      replyTo: me.email,
      subject: `${repFirst} wanted you to meet someone`,
      html:
        kit.hi(ownerName) +
        kit.p(`${escapeHtml(me.name)} from our team met someone you'd want to meet:`) +
        kit.big(escapeHtml(headline)) +
        (data && record.summary ? kit.p(escapeHtml(String(record.summary))) : "") +
        kit.button(ownerLink, "See the profile") +
        kit.quiet("To see their name and set up a meeting, sign up and put a card on file. Nothing is charged unless you hire."),
    }).catch(() => ({ ok: false }));
    emailedOwner = !!r?.ok;
  }
  let emailedCandidate = false;
  if (candEmail) emailedCandidate = !!(await requestPromise(id, false).catch(() => null))?.ok;

  await logActivity(me.email, "quick_intro", { candidate: refCode(id), to: ownerName, owner_phone: ownerPhone || undefined, owner_email: ownerEmail || undefined, in_browse: inBrowse, emailed_owner: emailedOwner });

  return { ok: true, candidateId: id, headline, ownerLink, ownerText, ownerPhone, ownerName, candText, candPhone, candName, emailedOwner, emailedCandidate, inBrowse };
}
