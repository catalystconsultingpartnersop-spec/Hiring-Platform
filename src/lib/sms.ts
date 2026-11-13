import { db, logActivity } from "./db";
import { brandName } from "./format";

// Text messages (Twilio). Used sparingly, for the moments where minutes matter.
// Three rules live here so no caller can skip them:
//   1. Nobody is texted unless they agreed to texts (and haven't said STOP).
//   2. Nothing goes out between 9pm and 8am New York time, or from Friday 3pm
//      until Sunday 8am; it waits.
//   3. Every send is recorded.
// Until the Twilio keys are in Vercel, nothing is sent and nothing breaks.

export type TextWho = "candidate" | "owner" | "staff";

// "+13475550123", or null if it isn't a US number we can text.
export function textNumber(raw: string | null | undefined): string | null {
  const d = String(raw ?? "").replace(/\D/g, "");
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  return ten.length === 10 && /^[2-9]/.test(ten) ? `+1${ten}` : null;
}

export function textingIsOn() {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_FROM));
}

// The exact words next to the box people tick. Kept with each consent, as the
// carriers ask.
export const CONSENT_WORDS =
  "Text me updates about my calls and introductions. Message frequency varies. Message and data rates may apply. Reply STOP to stop, HELP for help.";

// Someone ticked (or unticked) the box, or replied STOP.
export async function setTextConsent(phone: string | null | undefined, on: boolean, who: TextWho, source: string) {
  const to = textNumber(phone);
  if (!to) return false;
  await logActivity(`${who}:${to}`, "sms_consent", { phone: to, on, who, source, words: on ? CONSENT_WORDS : undefined });
  return true;
}

export async function textConsent(phone: string | null | undefined): Promise<boolean> {
  const to = textNumber(phone);
  if (!to) return false;
  const { data } = await db().from("activity_log").select("details").eq("action", "sms_consent").eq("details->>phone", to).order("at", { ascending: false }).limit(1);
  return (data?.[0] as { details: { on?: boolean } } | undefined)?.details?.on === true;
}

// No texts 9pm to 8am New York time, or from Friday 3pm until Sunday 8am.
export function quietNow(nowMs: number) {
  const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", weekday: "short", timeZone: "America/New_York" }).formatToParts(new Date(nowMs));
  const h = Number(parts.find((p) => p.type === "hour")?.value);
  const d = parts.find((p) => p.type === "weekday")?.value;
  if (d === "Sat" || (d === "Fri" && h >= 15)) return true;
  return h >= 21 || h < 8;
}

type Text = {
  to: string | null | undefined;
  body: string; // short; the brand name and any STOP line are added here
  kind: string; // what this text is, for the record ("call_booked", ...)
  once?: string; // a key: the same key is never texted twice
};

async function deliver(to: string, body: string): Promise<{ ok: boolean; code?: number; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const form = new URLSearchParams({ To: to, Body: body });
  if (process.env.TWILIO_MESSAGING_SERVICE_SID) form.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID);
  else form.set("From", process.env.TWILIO_FROM!);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`, "content-type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (res.ok) return { ok: true };
  const j = (await res.json().catch(() => ({}))) as { code?: number; message?: string };
  return { ok: false, code: j.code, error: j.message ?? `HTTP ${res.status}` };
}

// Send one text. Never throws: a text that can't go out must not break the
// thing that triggered it (the email still goes).
export async function sendText(t: Text, nowMs = Date.now()): Promise<"sent" | "queued" | "skipped"> {
  try {
    const to = textNumber(t.to);
    if (!to || !(await textConsent(to))) return "skipped";
    if (t.once) {
      const { count } = await db().from("activity_log").select("id", { count: "exact", head: true }).in("action", ["sms_sent", "sms_queued"]).eq("details->>once", t.once);
      if (count) return "skipped";
    }
    if (quietNow(nowMs)) {
      await logActivity("system", "sms_queued", { to, body: t.body, kind: t.kind, once: t.once ?? null });
      return "queued";
    }
    // The first text to anyone says how to stop.
    const { count: before } = await db().from("activity_log").select("id", { count: "exact", head: true }).eq("action", "sms_sent").eq("details->>to", to);
    const body = `${brandName()}: ${t.body}${before ? "" : " Reply STOP to stop texts."}`;
    if (!textingIsOn()) {
      console.log(`[text not sent: Twilio keys missing] to=${to} ${body}`);
      return "skipped";
    }
    const r = await deliver(to, body);
    if (r.ok) {
      await logActivity("system", "sms_sent", { to, kind: t.kind, once: t.once ?? null, body });
      return "sent";
    }
    // 21610: they replied STOP. Remember it, so we stop trying.
    if (r.code === 21610) await logActivity("system", "sms_consent", { phone: to, on: false, source: "stop" });
    await logActivity("system", "sms_failed", { to, kind: t.kind, code: r.code ?? null, error: r.error ?? null });
    return "skipped";
  } catch (e) {
    console.error("text failed", e);
    return "skipped";
  }
}

// Send what waited overnight or over the weekend. Called from the 10-minute cron.
export async function flushQueuedTexts(nowMs = Date.now()) {
  if (quietNow(nowMs)) return 0;
  const { data } = await db().from("activity_log").select("id, at, details").eq("action", "sms_queued").order("at", { ascending: true }).limit(50);
  let sent = 0;
  for (const r of (data ?? []) as { id: number; at: string; details: { to: string; body: string; kind: string; once: string | null } }[]) {
    await db().from("activity_log").delete().eq("id", r.id);
    // Dropped as stale: a reminder more than two hours late, anything else after two days.
    const age = nowMs - Date.parse(r.at);
    if (age > 44 * 3600e3 || (r.details.kind.includes("reminder") && age > 2 * 3600e3)) continue;
    if ((await sendText({ to: r.details.to, body: r.details.body, kind: r.details.kind, once: r.details.once ?? undefined }, nowMs)) === "sent") sent++;
  }
  return sent;
}
