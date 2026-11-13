import { randomBytes } from "crypto";
import { db, logActivity } from "./db";
import { escapeHtml as e, sendEmail } from "./email";
import { kit } from "./emailKit";
import { callIcs } from "./ics";
import { isCheckAccount, isOwnerEmail } from "./session";
import { openOwnerSlots } from "./slots";
import { bioFor } from "./staffBios";
import { COMPANY_TZ, formatInZone } from "./time";

// "Meet us": a business owner books a short video call with the people behind the
// company (Heshy and the partner). Times come from their weekly hours, minus calls
// they already have. Kept in activity_log ("owner_meeting"), no new tables.

export const MEET_LENGTHS = [10, 20, 30] as const;

export type Leader = { id: string; email: string; name: string; first: string; title: string; line: string | null; bio: string | null; photo: string | null };

// Photos in public/team/, by first name. Add one here when it arrives.
const PHOTOS: Record<string, string> = {};

export async function leaders(): Promise<Leader[]> {
  const { data } = await db().from("staff").select("id, email, full_name, role, is_partner, active").eq("active", true);
  const rows = ((data ?? []) as { id: string; email: string; full_name: string | null; role: string; is_partner: boolean | null }[]).filter(
    (s) => !isCheckAccount(s.email) && (isOwnerEmail(s.email) || s.is_partner),
  );
  // Heshy first, then the partner.
  rows.sort((a, b) => Number(isOwnerEmail(b.email)) - Number(isOwnerEmail(a.email)));
  return Promise.all(
    rows.map(async (s) => {
      const bio = (await bioFor(isOwnerEmail(s.email) ? "heshy" : s.id)) ?? (await bioFor(s.id));
      const name = s.full_name || s.email;
      return { id: s.id, email: s.email, name, first: name.split(" ")[0], title: isOwnerEmail(s.email) ? "Founder" : "Partner", line: bio?.line || null, bio: bio?.bio || null, photo: PHOTOS[name.split(" ")[0].toLowerCase()] ?? null };
    }),
  );
}

// Open times when at least one of them is free.
export async function meetTimes(): Promise<{ start: string; hosts: string[] }[]> {
  const ids = new Set((await leaders()).map((l) => l.id));
  return (await openOwnerSlots())
    .map((s) => ({ start: s.start, hosts: s.reps.filter((r) => ids.has(r)) }))
    .filter((s) => s.hosts.length);
}

export type MeetRequest = { minutes?: number; name: string; business: string; email: string; phone: string; role: string; town: string; when: string; notes: string; phoneCall: boolean };

export async function bookMeeting(startIso: string, r: MeetRequest, ownerTz: string) {
  const slot = (await meetTimes()).find((s) => s.start === new Date(startIso).toISOString());
  if (!slot) return { error: "That time was just taken. Pick another one." };
  const team = await leaders();
  // Shloimy (the partner) hosts when he's free. Heshy is second. Both are invited.
  const free = team.filter((l) => slot.hosts.includes(l.id));
  const host = free.find((l) => !isOwnerEmail(l.email)) ?? free[0];
  const minutes = MEET_LENGTHS.includes(r.minutes as 10) ? (r.minutes as number) : 20;
  const ends = new Date(Date.parse(slot.start) + minutes * 60e3).toISOString();

  let link = "";
  let space: string | null = null;
  try {
    const { newRecordedMeeting, addCohost } = await import("./googleCalls");
    const { callEmailFor } = await import("./callAccounts");
    const room = await newRecordedMeeting(await callEmailFor(host));
    if (room) {
      link = room.link;
      space = room.space;
      for (const l of team) if (l.id !== host.id) await addCohost(room.space, await callEmailFor(l)).catch(() => null);
    }
  } catch (err) {
    console.error("meet-us room", err);
  }
  if (!link) {
    const { data } = await db().from("staff").select("meeting_link").eq("id", host.id).maybeSingle();
    link = (data?.meeting_link as string | null) ?? "";
  }

  const token = randomBytes(12).toString("base64url");
  await logActivity(`public:${r.email}`, "owner_meeting", { ...r, starts_at: slot.start, ends_at: ends, staff_id: host.id, link, space, token, owner_tz: ownerTz });

  // Their opening goes on the private positions list, for matching.
  await db()
    .from("positions")
    .insert({ title: r.role || "Opening (from a Meet us call)", company: r.business, location: r.town || null, starts: r.when || null, needs: r.notes || null, source: "meet_us", contact_name: r.name, contact_email: r.email, added_by: "meet_us" })
    .then(
      () => null,
      () => null,
    );

  const names = team.map((l) => l.first).join(" and ");
  const whenOwner = formatInZone(slot.start, ownerTz);
  const ics = callIcs({ uid: `meet-${token}@thecandidatecollection.com`, start: slot.start, end: ends, title: `Call with ${names}, The Candidate Collection`, description: link ? `Join: ${link}` : "We'll call you.", location: link || null });
  await sendEmail({
    to: r.email,
    subject: `You're booked: ${whenOwner}`,
    audience: "owner",
    html:
      kit.hi(r.name) +
      kit.big(`Talk soon. ${e(whenOwner)}`) +
      kit.p(
        r.phoneCall
          ? `${e(names)} will call you at ${e(r.phone)}.`
          : `A ${minutes}-minute video call with ${e(names)}. We'll hear about your opening, walk you through how we work, and look at who might be a fit.`,
      ) +
      (link && !r.phoneCall ? kit.button(link, "Join the call") : "") +
      kit.quiet("Need a different time? Just reply to this email."),
    attachments: [{ filename: "call.ics", content: Buffer.from(ics) }],
    replyTo: host.email,
  }).catch(() => null);

  const whenUs = formatInZone(slot.start, COMPANY_TZ);
  for (const l of team)
    await sendEmail({
      to: l.email,
      subject: `New owner call: ${r.business || r.name}, ${whenUs}`,
      audience: "team",
      html:
        kit.big(`${e(r.name)}${r.business ? `, ${e(r.business)}` : ""} booked a call`) +
        kit.facts([
          ["When", whenUs + (l.id === host.id ? " (you're hosting)" : "")],
          ["Length", `${minutes} minutes`],
          ["Hiring for", r.role ? e(r.role) : null],
          ["Where", r.town ? e(r.town) : null],
          ["Needs someone", r.when ? e(r.when) : null],
          ["Notes", r.notes ? e(r.notes) : null],
          ["Phone", r.phone ? e(r.phone) : null],
          ["Email", r.email ? e(r.email) : null],
          ["How", r.phoneCall ? "Wants a phone call" : "Video"],
        ]) +
        (link ? kit.button(link, "Join the call") : "") +
        kit.quiet("Their opening was added to Positions, so you can match candidates before the call."),
      attachments: [{ filename: "call.ics", content: Buffer.from(ics) }],
      replyTo: r.email,
    }).catch(() => null);

  return { ok: true as const, when: slot.start, link, phoneCall: r.phoneCall, names };
}
