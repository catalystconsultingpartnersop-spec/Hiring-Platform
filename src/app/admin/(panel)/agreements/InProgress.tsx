import Link from "next/link";
import { AgreementRow, latest, repName, StaffLite } from "@/lib/adminData";
import { nextStep, NUDGE_LABEL, nudgeText, type NudgeKind } from "@/lib/clientFollowUp";
import { db } from "@/lib/db";
import { BIG_STEPS, bigStepIndex, loadPath, pathState, STAGE_TEAM_LABEL, type Stage } from "@/lib/path";
import { isOwnerEmail } from "@/lib/session";
import { remindToPick } from "../../actions";
import { NudgeBox } from "../clients/[id]/NudgeBox";
import { NudgeRep } from "./NudgeRep";
import s from "./intro.module.css";

const DAY = 864e5;
const CLIENT_TURN: Stage[] = ["offer_call", "call_retime", "call_feedback", "offer_meeting", "meeting_retime", "meeting_feedback", "decide"];
const CAND_TURN: Stage[] = ["call_proposed", "meeting_proposed", "refs_waiting"];
const ago = (ms: number) => {
  const d = Math.floor(ms / DAY);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};
const short = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });

// Every introduction that's still open: where it's up to, who we're waiting on,
// the suggested next step, and one-tap ways to move it along.
export async function InProgress({ rows, people, now, me }: { rows: AgreementRow[]; people: Map<string, StaffLite>; now: number; me: string }) {
  const signed = rows.filter((a) => a.confirmed_at);
  const paths = await loadPath(signed.map((a) => a.id));
  const open = signed
    .map((a) => ({ a, p: pathState(a, paths, { hireStatus: latest(a.hires)?.status, candidateStatus: a.candidates.status, nowMs: now }) }))
    .filter(({ p }) => !["hired", "passed", "declined", "taken"].includes(p.stage));
  const ids = open.map(({ a }) => a.id);
  const { data: log } = ids.length
    ? await db().from("activity_log").select("at, action, details").in("action", ["owner_nudge", "rep_nudge"]).in("details->>unlock_id", ids).order("at", { ascending: false })
    : { data: [] };
  const nudges = (log ?? []) as { at: string; action: string; details: { unlock_id: string; by?: string } }[];

  const items = open
    .map(({ a, p }) => {
      const turn = CLIENT_TURN.includes(p.stage) ? "client" : CAND_TURN.includes(p.stage) ? "candidate" : "booked";
      const mine = nudges.filter((n) => n.details.unlock_id === a.id);
      const moved = Math.max(
        Date.parse(a.signed_at),
        ...paths.meetings.filter((m) => m.unlock_id === a.id).map((m) => Date.parse(m.updated_at || m.created_at)),
        ...paths.refs.filter((r) => r.unlock_id === a.id).map((r) => Date.parse(r.given_at || r.created_at)),
      );
      // A booked call that already happened counts from when it ended.
      const since = p.meeting?.starts_at && p.stage.endsWith("feedback") ? Math.max(moved, Date.parse(p.meeting!.starts_at!)) : moved;
      return { a, p, turn, quiet: now - since, toClient: mine.find((n) => n.action === "owner_nudge"), toRep: mine.find((n) => n.action === "rep_nudge") };
    })
    .sort((x, y) => Number(x.turn === "booked") - Number(y.turn === "booked") || y.quiet - x.quiet);

  const count = (t: string) => items.filter((i) => i.turn === t).length;
  if (!items.length)
    return <p className="panel panel-wash">No open introductions right now. When a client signs to meet a candidate, it shows up here with each step.</p>;

  return (
    <>
      <p className={s.sum}>
        <span><b>{count("client")}</b> waiting on the client</span>
        <span><b>{count("candidate")}</b> waiting on the candidate</span>
        <span><b>{count("booked")}</b> booked</span>
      </p>
      <ul className={s.list}>
        {items.map(({ a, p, turn, quiet, toClient, toRep }) => {
          const ownerId = (a as AgreementRow & { owner_id: string }).owner_id;
          const cand = a.candidates.full_name;
          const step = nextStep(p, cand);
          const big = bigStepIndex(p.stage);
          const rep = people.get(a.candidates.added_by ?? "");
          const repFirst = rep && !isOwnerEmail(rep.email) && (rep as StaffLite & { active?: boolean }).active !== false ? (repName(rep) ?? "").split(" ")[0] || null : null;
          const stale = turn !== "booked" && quiet >= 3 * DAY;
          const kinds: NudgeKind[] = step.kind ? [step.kind] : [];
          if (turn === "client" && !kinds.includes("checkin")) kinds.push("checkin");
          const options = kinds.map((kind) => ({ kind, label: NUDGE_LABEL[kind], ...nudgeText(kind, { owner: a.owners.full_name, cand, me, p }) }));
          return (
            <li key={a.id} className={`${s.card} ${stale ? s.stale : ""}`}>
              <div className={s.top}>
                <div>
                  <h3 className={s.title}>
                    <Link prefetch={false} href={`/admin/clients/${ownerId}`}>{a.owners.company || a.owners.email}</Link>
                    <span aria-hidden> and </span>
                    <Link prefetch={false} href={`/admin/candidates/${a.candidate_id}`}>{cand}</Link>
                  </h3>
                  <p className={s.meta}>
                    {a.owners.full_name}
                    {a.owners.phone ? `, ${a.owners.phone}` : ""} · Signed {short(a.signed_at)} · Rep: {rep ? repName(rep) : "none yet"}
                  </p>
                </div>
                <span className={`tag ${turn === "booked" ? "tag-good" : "tag-gold"}`}>{STAGE_TEAM_LABEL[p.stage]}</span>
              </div>
              <ol className={s.steps} aria-label="Progress">
                {BIG_STEPS.map((label, i) => (
                  <li key={label} className={i < big ? s.past : i === big ? s.now : ""}>
                    {label}
                  </li>
                ))}
              </ol>
              <p className={s.next}>
                <b>{turn === "booked" ? "Where it stands" : "Suggested next step"}</b>
                {step.line}
                {turn !== "booked" && <span className={stale ? s.quietBad : s.quiet}> Last movement {ago(quiet)}.</span>}
              </p>
              {(toClient || toRep) && (
                <p className={s.sent}>
                  {toClient && <>Client reminded {short(toClient.at)}. </>}
                  {toRep && <>Rep nudged {short(toRep.at)}.</>}
                </p>
              )}
              <div className={s.acts}>
                {turn === "client" && <NudgeBox ownerId={ownerId} unlockId={a.id} options={options} suggested={step.kind} recent={null} />}
                {turn === "candidate" && p.meeting && p.stage !== "refs_waiting" && (
                  <form action={remindToPick.bind(null, p.meeting.id)}>
                    <button className="btn btn-small btn-ghost">✉️ Remind {cand.split(" ")[0]} to pick a time</button>
                  </form>
                )}
                {repFirst && turn !== "booked" && <NudgeRep unlockId={a.id} rep={repFirst} />}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
