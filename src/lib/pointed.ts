import { db, logActivity } from "./db";
import { sendEmail } from "./email";
import { kit, layout } from "./emailKit";
import { teamUrl } from "./format";

// "Suggest them" sends: who a rep passed a candidate to, whether the profile was
// opened, and whether they went on to sign. Kept in activity_log (no new tables).

type SendRow = { at: string; details: { candidate_id: string; to_key: string; to_name?: string | null; channel?: string; by_name?: string; by_email?: string; token?: string } };

export type PointedPerson = {
  key: string;
  name: string;
  isEmail: boolean;
  sends: { at: string; channel: string; by: string }[];
  openedAt: string | null;
  opens: number;
  lastToken: string | null;
  tracked: boolean; // sent with a trackable link (older sends weren't)
  signedAt: string | null;
};

const last10 = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "").slice(-10);

export async function listPointed(candidateId: string): Promise<PointedPerson[]> {
  const { data } = await db()
    .from("activity_log")
    .select("at, details")
    .eq("action", "candidate_pointed")
    .eq("details->>candidate_id", candidateId)
    .order("at", { ascending: true })
    .limit(100);
  const sends = (data ?? []) as SendRow[];
  if (!sends.length) return [];
  const tokens = sends.map((s) => s.details.token).filter((t): t is string => !!t);
  const [{ data: opens }, { data: unlocks }] = await Promise.all([
    tokens.length
      ? db().from("activity_log").select("at, details").eq("action", "pointed_open").in("details->>token", tokens).order("at", { ascending: true })
      : Promise.resolve({ data: [] as { at: string; details: { token: string } }[] }),
    db().from("unlocks").select("signed_at, confirmed_at, owners(email, phone)").eq("candidate_id", candidateId),
  ]);
  const people = new Map<string, PointedPerson & { tokens: Set<string> }>();
  for (const s of sends) {
    const d = s.details;
    const p = people.get(d.to_key) ?? { key: d.to_key, name: d.to_name || d.to_key, isEmail: d.to_key.includes("@"), sends: [], openedAt: null, opens: 0, lastToken: null, tracked: false, signedAt: null, tokens: new Set<string>() };
    if (d.to_name) p.name = d.to_name;
    p.sends.push({ at: s.at, channel: d.channel ?? "text", by: (d.by_name ?? "").split(" ")[0] || "Someone" });
    if (d.token) {
      p.tokens.add(d.token);
      p.tracked = true;
      p.lastToken = d.token;
    }
    people.set(d.to_key, p);
  }
  for (const o of (opens ?? []) as { at: string; details: { token: string } }[]) {
    for (const p of people.values())
      if (p.tokens.has(o.details.token)) {
        p.opens++;
        p.openedAt ??= o.at;
      }
  }
  for (const u of (unlocks ?? []) as unknown as { signed_at: string; confirmed_at: string | null; owners: { email: string; phone: string | null } | null }[]) {
    if (!u.confirmed_at || !u.owners) continue;
    const p = people.get(u.owners.email.toLowerCase()) ?? (last10(u.owners.phone).length === 10 ? people.get(last10(u.owners.phone)) : undefined);
    if (p) p.signedAt = u.signed_at;
  }
  return [...people.values()].map(({ tokens: _t, ...p }) => (void _t, p)).reverse();
}

// Someone opened a suggested profile link. Logged every time; the rep who sent it
// gets one email, the first time, so they know it's a good moment to follow up.
export async function recordPointedOpen(token: string) {
  if (!/^[a-z0-9]{6,16}$/.test(token)) return;
  const { data } = await db().from("activity_log").select("at, details").eq("action", "candidate_pointed").eq("details->>token", token).limit(1);
  const send = (data?.[0] as SendRow | undefined)?.details;
  if (!send) return;
  const { count } = await db().from("activity_log").select("id", { count: "exact", head: true }).eq("action", "pointed_open").eq("details->>token", token);
  await logActivity("public", "pointed_open", { token, candidate_id: send.candidate_id });
  if (count || !send.by_email) return;
  const { data: c } = await db().from("candidates").select("full_name").eq("id", send.candidate_id).maybeSingle();
  const first = ((c?.full_name as string | undefined) ?? "").split(" ")[0] || "the candidate";
  const who = send.to_name || send.to_key;
  const k = kit;
  await sendEmail({
    to: send.by_email,
    subject: `${who} just opened ${first}'s profile`,
    audience: "team",
    html: layout(
      k.hi((send.by_name ?? "").split(" ")[0] || null) +
        k.big(`${k.esc(who)} just opened ${k.esc(first)}'s profile`) +
        k.p("The one you suggested. Could be a good moment to follow up.") +
        k.button(`${teamUrl()}/admin/candidates/${send.candidate_id}#suggested`, "See who you sent it to"),
      "team",
    ),
  });
}
