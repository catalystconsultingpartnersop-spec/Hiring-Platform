import { pathCtx, sendPickReminder } from "@/lib/pathEmails";
import { db } from "@/lib/db";
import { currentStaff, readSignedToken } from "@/lib/session";

// From the rep's "waiting on" email: one tap emails the candidate a reminder to answer.
export async function GET(req: Request) {
  const id = readSignedToken(new URL(req.url).searchParams.get("t"), "nudge_");
  const page = (title: string, line: string) =>
    new Response(
      `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font-family:system-ui,Arial;max-width:480px;margin:60px auto;padding:0 20px;color:#17213a"><h1 style="font-size:26px">${title}</h1><p style="font-size:18px;line-height:1.5;color:#3a4560">${line}</p></body>`,
      { headers: { "content-type": "text/html; charset=utf-8" } },
    );
  if (!id) return page("This link has expired", "Open the candidate's page on the site to nudge them.");
  const { data: m } = await db().from("meetings").select("unlock_id, status, nudged_at").eq("id", id).maybeSingle();
  if (!m) return page("Not found", "This introduction isn't there anymore.");
  if (m.status !== "proposed") return page("They already answered", "Nothing to do. Thanks for checking in.");
  if (m.nudged_at && Date.now() - Date.parse(m.nudged_at) < 6 * 36e5) return page("Reminder already sent", "A reminder went out in the last few hours. Give them a little time.");
  const me = await currentStaff();
  const c = await pathCtx(m.unlock_id);
  const rep = me ?? (c?.team[0] ? { name: c.team[0].full_name, email: c.team[0].email } : null);
  const r = await sendPickReminder(id, { name: rep?.name ?? null, email: rep?.email ?? "" });
  return r.ok ? page("Reminder sent ✓", "We emailed them a reminder in your name, with one tap to answer. Replies come to you.") : page("Didn't send", r.error ?? "Try again from their page.");
}
