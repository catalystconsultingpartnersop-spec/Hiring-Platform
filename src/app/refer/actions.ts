"use server";

import { redirect } from "next/navigation";
import { logActivity } from "@/lib/db";
import { emailAdmin, escapeHtml as e, sendEmail } from "@/lib/email";
import { kit } from "@/lib/emailKit";
import { siteUrl } from "@/lib/format";
import { addReferrer, referLink, type Referrer } from "@/lib/referrers";
import { allow, SLOW_DOWN } from "@/lib/throttle";

export type ReferState = { error?: string; resent?: string; fields?: Record<string, string> };


async function sendTheirLink(r: Referrer, again: boolean) {
  await sendEmail({
    to: r.email,
    subject: again ? "Your referral link, again" : "Your referral link for The Candidate Collection",
    audience: "owner",
    html:
      kit.hi(r.name) +
      kit.p(again ? "Here's your link again." : "Thanks for spreading the word. Here's your own link:") +
      kit.box(`<strong>${e(referLink(r))}</strong>`) +
      kit.p("Send it to business owners you know who are hiring. When an owner who signed up through it hires someone through us, we send you 5% of our fee: $250 on a standard $5,000 hire.") +
      kit.button(`${siteUrl()}/refer/${r.token}`, "Your page: share buttons and how it's going") +
      kit.quiet("Keep this email. The button takes you to your own page any time."),
  }).catch(() => null);
}

export async function signUpReferrer(_prev: ReferState, form: FormData): Promise<ReferState> {
  const get = (k: string) => String(form.get(k) ?? "").trim().slice(0, 200);
  const fields = { name: get("name"), email: get("email").toLowerCase(), phone: get("phone"), pay: get("pay") };
  if (form.get("website")) return {}; // spam trap
  if (fields.name.length < 2) return { error: "Add your name.", fields };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) return { error: "That email doesn't look quite right.", fields };
  if (!form.get("agree")) return { error: "Check the box to agree to how it works.", fields };
  if (!(await allow("refer-signup", 5, 60))) return { error: SLOW_DOWN, fields };
  const { r, existed } = await addReferrer(fields);
  await sendTheirLink(r, existed);
  // Already signed up: the link goes to their email only, so nobody else can see it.
  if (existed) return { resent: r.email };
  await logActivity(`public:${r.email}`, "referrer_signed_up", { code: r.code, name: r.name });
  await emailAdmin(
    `New referral partner: ${r.name}`,
    `<p><strong>${e(r.name)}</strong> signed up to refer business owners.</p><p>${e(r.email)}${r.phone ? ` · ${e(r.phone)}` : ""}<br>Pay by: ${e(r.pay || "not given")}<br>Their link: ${e(referLink(r))}</p><p>You'll see them under Finance → Referral partners.</p>`,
  ).catch(() => null);
  redirect(`/refer/${r.token}?new=1`);
}
