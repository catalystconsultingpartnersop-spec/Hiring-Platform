"use server";

import { logActivity } from "@/lib/db";
import { emailAdmin, escapeHtml as e } from "@/lib/email";
import { bookMeeting, type MeetRequest } from "@/lib/meetUs";
import { allow, SLOW_DOWN } from "@/lib/throttle";
import { validTimeZone } from "@/lib/time";

function clean(r: MeetRequest): MeetRequest | string {
  const t = (s: unknown, n = 200) => String(s ?? "").trim().slice(0, n);
  const out = { name: t(r.name), business: t(r.business), email: t(r.email).toLowerCase(), phone: t(r.phone, 40), role: t(r.role), town: t(r.town), when: t(r.when, 60), notes: t(r.notes, 1000), phoneCall: !!r.phoneCall, minutes: [10, 20, 30].includes(Number(r.minutes)) ? Number(r.minutes) : 20 };
  if (!out.role) return "Tell us what you're hiring for.";
  if (out.name.length < 2) return "Add your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) return "That email doesn't look quite right.";
  if (out.phoneCall && out.phone.replace(/\D/g, "").length < 10) return "Add the number we should call.";
  return out;
}

export async function bookMeetUs(iso: string, tz: string, r: MeetRequest) {
  const c = clean(r);
  if (typeof c === "string") return { error: c };
  if (!(await allow("meet-us", 6, 60))) return { error: SLOW_DOWN };
  return bookMeeting(iso, c, validTimeZone(tz));
}

// No open times: they leave their details and we call to set a time.
export async function askForCall(r: MeetRequest) {
  const c = clean({ ...r, phoneCall: false });
  if (typeof c === "string") return { error: c };
  if (!(await allow("meet-us", 6, 60))) return { error: SLOW_DOWN };
  await logActivity(`public:${c.email}`, "owner_meeting_request", c);
  await emailAdmin(
    `Call request: ${c.business || c.name}`,
    `<p><strong>${e(c.name)}</strong>${c.business ? `, ${e(c.business)}` : ""} wants to talk. There were no open times, so call them to set one.</p><p>Hiring for: ${e(c.role)}<br>Where: ${e(c.town || "-")}<br>Needs someone: ${e(c.when || "-")}<br>Phone: ${e(c.phone || "-")}<br>Email: ${e(c.email)}</p>${c.notes ? `<p>${e(c.notes)}</p>` : ""}`,
    { replyTo: c.email },
  ).catch(() => null);
  return { ok: true as const };
}

// "Don't see a time that works? Request a call back." Skips scheduling: they go on
// the waiting list and Shloimy calls them.
export async function callMeInstead(r: MeetRequest) {
  const t = (s: string, n = 120) => String(s ?? "").trim().slice(0, n);
  const role = t(r.role), name = t(r.name), phone = t(r.phone, 40), email = t(r.email, 200).toLowerCase(), business = t(r.business);
  if (!role) return { error: "Tell us what you're hiring for, in step 1." };
  if (name.length < 2) return { error: "Add your name, in step 2." };
  if (phone.replace(/\D/g, "").length < 10) return { error: "Add the phone number we should call, in step 2." };
  if (!(await allow("callback", 5, 60))) return { error: SLOW_DOWN };
  const { fileCallback } = await import("@/lib/ownerLeads");
  await fileCallback({ role, name, phone, email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined, business, from: "meet" });
  return { ok: true as const };
}
