"use server";

import { db, logActivity } from "@/lib/db";
import { escapeHtml as e, sendEmail } from "@/lib/email";
import { kit } from "@/lib/emailKit";
import { teamUrl } from "@/lib/format";
import { callbackAnswerers } from "@/lib/ownerLeads";
import { allow, SLOW_DOWN } from "@/lib/throttle";

export type CallbackState = { ok?: boolean; error?: string; phone?: string };

// The front page's quick ask: the position and a number, and we call back.
// Both leaders get it right away with a one-tap search of the collection, so the
// call can start with who fits (or an honest "no one yet, but we can look").
export async function requestCallback(_: CallbackState, form: FormData): Promise<CallbackState> {
  const t = (k: string, n = 120) => String(form.get(k) ?? "").trim().slice(0, n);
  const role = t("role");
  const name = t("name");
  const phone = t("phone", 40);
  if (!role) return { error: "Tell us the position you're hiring for." };
  if (name.length < 2) return { error: "Add your name." };
  if (phone.replace(/\D/g, "").length < 10) return { error: "Add the number we should call." };
  if (!(await allow("callback", 5, 60))) return { error: SLOW_DOWN };

  await logActivity(`public:${phone}`, "owner_callback_request", { role, name, phone });
  await db()
    .from("positions")
    .insert({ title: role, source: "callback", contact_name: name, needs: `Call back: ${phone}`, added_by: "callback" })
    .then(
      () => null,
      () => null,
    );
  const search = `${teamUrl()}/admin/candidates?q=${encodeURIComponent(role)}`;
  // Shloimy answers call-backs. Heshy sees them on the waiting list, and both are
  // emailed if one is still unanswered after half an hour.
  for (const l of await callbackAnswerers())
    await sendEmail({
      to: l.email,
      subject: `Call back: ${name}, hiring for ${role}`,
      audience: "team",
      html:
        kit.big(`${e(name)} wants a call back`) +
        kit.facts([
          ["Hiring for", e(role)],
          ["Phone", e(phone)],
        ]) +
        kit.button(search, "Search the collection for this") +
        kit.button(`${teamUrl()}/admin/waiting`, "Mark them as called") +
        kit.quiet("The front page says they could be interviewing someone within half an hour of our call. If no one fits, tell them straight, and that we can look."),
    }).catch(() => null);
  return { ok: true, phone };
}
