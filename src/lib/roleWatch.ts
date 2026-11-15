import { db, logActivity } from "./db";
import { escapeHtml as e, emailAdmin, sendEmail } from "./email";
import { kit } from "./emailKit";
import { lowerRole, siteUrl } from "./format";
import { callbackAnswerers } from "./ownerLeads";
import { canonicalRoles } from "./roles";
import { isOwnerEmail } from "./session";
import { sendText, textNumber } from "./sms";

// "Tell me when": a business owner browsing leaves a role and a cell number, and
// gets a text when a candidate in that role is listed. Kept in activity_log.

export const WATCH_WORDS =
  "You agree to texts from The Candidate Collection. Msg frequency varies. Msg & data rates may apply. Reply STOP to stop, HELP for help.";

type Watch = { at: string; details: { phone: string; role: string; roles: string[]; ref?: string | null } };

export async function addRoleWatch(input: { role: string; phone: string; ref?: string | null }): Promise<{ ok: boolean; error?: string }> {
  const role = input.role.trim().replace(/\s+/g, " ").slice(0, 60);
  const to = textNumber(input.phone);
  if (role.length < 2) return { ok: false, error: "Tell us the role you'd want to hear about." };
  if (!to) return { ok: false, error: "That doesn't look like a cell number we can text. Check it and try again." };
  const since = new Date(Date.now() - 864e5).toISOString();
  const { data: mine } = await db().from("activity_log").select("details").eq("action", "role_watch").eq("details->>phone", to).gte("at", since);
  const today = (mine ?? []) as { details: { role: string } }[];
  if (today.some((w) => w.details.role.toLowerCase() === role.toLowerCase())) return { ok: true };
  if (today.length >= 5) return { ok: false, error: "That's a lot for one day. Use Contact us and we'll take it from there." };

  await logActivity(`owner:${to}`, "sms_consent", { phone: to, on: true, who: "owner", source: "role_watch", words: WATCH_WORDS });
  await logActivity(`owner:${to}`, "role_watch", { phone: to, role, roles: canonicalRoles(role), ref: input.ref ?? null });
  await sendText({ to, body: `You're set. We'll text you when ${a(role)} joins.`, kind: "role_watch_on", once: `role_watch_on:${to}:${role.toLowerCase()}` });

  // A browsing owner who leaves a number is a lead: Shloimy hears about it, Heshy gets a copy.
  const html =
    kit.p("A business owner browsing the candidates asked for a text when someone joins.") +
    kit.facts([
      ["Role", e(role)],
      ["Cell", e(to)],
      ["Came through", input.ref ? `${e(input.ref)}'s link` : null],
    ]) +
    kit.p("The site texts them by itself when a match is listed. A quick call from us could help too.");
  const subject = `Tell me when: ${role}`;
  const team = await callbackAnswerers().catch(() => []);
  await Promise.all(team.filter((t) => !isOwnerEmail(t.email)).map((t) => sendEmail({ to: t.email, subject, html, audience: "team" }).catch(() => null)));
  await emailAdmin(subject, html).catch(() => null);
  return { ok: true };
}

const a = (role: string) => `${/^[aeiou]/i.test(role) ? "an" : "a"} ${lowerRole(role)}`;

function fits(w: Watch["details"], c: { role_category: string | null; also_roles: string[] | null; headline: string | null }) {
  const theirs = [...canonicalRoles(c.role_category), ...(c.also_roles ?? []).flatMap(canonicalRoles)].map((r) => r.toLowerCase());
  if (w.roles.some((r) => theirs.includes(r.toLowerCase()))) return true;
  const typed = w.role.toLowerCase();
  return typed.length >= 4 && [c.role_category, ...(c.also_roles ?? []), c.headline].some((t) => (t ?? "").toLowerCase().includes(typed));
}

// Runs with the 10-minute cron: anyone listed in the last two days is checked
// against the open requests. Each person hears about each candidate once, and
// only about candidates listed after they asked.
export async function textRoleWatchers(nowMs = Date.now()) {
  const { data: fresh } = await db()
    .from("candidates")
    .select("id, role_category, also_roles, headline, listed_at")
    .eq("status", "listed")
    .gte("listed_at", new Date(nowMs - 2 * 864e5).toISOString());
  const cands = (fresh ?? []) as { id: string; role_category: string | null; also_roles: string[] | null; headline: string | null; listed_at: string }[];
  if (!cands.length) return 0;
  const { data } = await db().from("activity_log").select("at, details").eq("action", "role_watch").gte("at", new Date(nowMs - 365 * 864e5).toISOString());
  let sent = 0;
  for (const w of (data ?? []) as Watch[])
    for (const c of cands) {
      if (Date.parse(c.listed_at) <= Date.parse(w.at) || !fits(w.details, c)) continue;
      const r = await sendText(
        { to: w.details.phone, body: `${a(w.details.role).replace(/^a/, "A")} just joined. Take a look: ${siteUrl()}/candidates/${c.id}`, kind: "role_watch", once: `role_watch:${w.details.phone}:${c.id}` },
        nowMs,
      );
      if (r === "sent") sent++;
    }
  return sent;
}
