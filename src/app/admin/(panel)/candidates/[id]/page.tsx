import { requireStaff } from "@/lib/session";
import { PointToOwner } from "./PointToOwner";
import { siteUrl } from "@/lib/format";
import { CallNow } from "./CallNow";
import { callEmailFor } from "@/lib/callAccounts";
import { SendButton } from "@/components/SendButton";
import { problemFor } from "@/lib/emailProblems";
import { EmailProblemFlag } from "@/components/EmailProblemFlag";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTiers } from "@/lib/catalog";
import { Candidate, db } from "@/lib/db";
import { dateShort, feeFor, money, refCode } from "@/lib/format";

import { deleteCandidate, resendPromise } from "../../../actions";
import { CandidateForm } from "../CandidateForm";
import { RepPicker } from "../RepPicker";
import { PositionsTheyFit } from "../PositionsTheyFit";
import { ReminderOption, Reminders } from "../Reminders";
import { CallDraftPanel } from "../CallDraftPanel";
import { ResumePanel } from "../ResumePanel";
import { cleanResumeOf } from "@/lib/cleanResume";
import { canEditCandidate, effectiveReps, repOptions } from "@/lib/reps";
import { COMPANY_TZ, formatInZone } from "@/lib/time";

export default async function EditCandidate({ params, searchParams }: PageProps<"/admin/candidates/[id]">) {
  const me = await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await db().from("candidates").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  // Everyone on the team can see every candidate; only their rep (or Heshy) can change them.
  const canEdit = await canEditCandidate(me, id);
  const c = data as Candidate;

  const tierFee = feeFor({ ...c, fee_override_cents: null }, await getTiers());

  const { data: calls } = await db()
    .from("onboarding_calls")
    .select("*, staff(full_name, email, time_zone)")
    .eq("candidate_id", id)
    .order("starts_at", { ascending: false });
  const callRows = (calls ?? []) as unknown as {
    id: string;
    starts_at: string;
    status: string;
    staff: { full_name: string | null; email: string; time_zone: string | null };
  }[];

  const { data: unlocks } = await db()
    .from("unlocks")
    .select("id, signed_at, owners(company, email)")
    .eq("candidate_id", id)
    .order("signed_at", { ascending: false });

  return (
    <>
      <div className="page-head" style={{ paddingBottom: 8 }}>
        <p className="small muted">
          {refCode(c.id)}, applied {dateShort(c.created_at)}
          {c.status === "listed" && (
            <>
              {" "}
              · <Link href={`/candidates/${c.id}`}>View public profile</Link>
            </>
          )}
        </p>
        <h1>{c.full_name}</h1>
        {!canEdit && <ViewOnly candidateId={c.id} addedBy={(c as unknown as { added_by: string | null }).added_by ?? null} />}
        <RO edit={canEdit}>
          <EmailProblemFlag email={c.email} p={await problemFor(c.email)} />
        </RO>
        {typeof sp.saved === "string" && (
          <p className={`notice ${sp.saved === "listed" ? "notice-good" : "notice-gold"}`} style={{ marginTop: 14 }}>
            {sp.saved === "listed"
              ? "Saved. They're live in the catalog."
              : sp.saved === "promise"
                ? "Saved. We've emailed them their candidate agreement. Their profile goes live the moment they sign."
                : "Saved as a draft. Owners won't see them until you set the status to Listed."}
          </p>
        )}
        {sp.merged === "1" && (
          <p className="notice notice-gold" style={{ marginTop: 10 }}>
            {c.full_name.split(" ")[0]} was already in the system with this email, so everything you entered was added to
            their existing profile instead of making a second one.
          </p>
        )}
        {typeof sp.resume === "string" && (
          <p className="notice notice-bad" role="alert" style={{ marginTop: 10 }}>
            Everything else was saved, but {sp.resume}. Attach it again in section 1 and save.
          </p>
        )}
        <RO edit={canEdit}>
          <PromiseRow c={c as Candidate & { promise_signed_at?: string | null; promise_name?: string | null; promise_requested_at?: string | null; list_on_sign?: boolean }} />
        </RO>
        <RepRow
          candidateId={c.id}
          addedBy={(c as unknown as { added_by: string | null }).added_by ?? null}
          admin={me.manager}
          meId={me.id}
        />
        {callRows.length > 0 && (
          <p style={{ marginTop: 10 }}>
            Onboarding call:{" "}
            {callRows
              .map(
                (k) =>
                  `${formatInZone(k.starts_at, k.staff.time_zone ?? COMPANY_TZ, { weekday: "short", month: "short" })} with ${k.staff.full_name || k.staff.email} (${k.status.replace("_", "-")})`,
              )
              .join("; ")}
          </p>
        )}
        {(unlocks ?? []).length > 0 && (
          <p style={{ marginTop: 10 }}>
            Signed for by:{" "}
            {(unlocks as unknown as { id: string; signed_at: string; owners: { company: string } }[])
              .map((u) => `${u.owners.company} (${dateShort(u.signed_at)})`)
              .join(", ")}
          </p>
        )}
      </div>
      {callRows.some((k) => (k as { meet_space?: string | null }).meet_space && k.status !== "cancelled") && (() => {
        let d: { made_at?: string; private_notes?: string } | null = null;
        try {
          d = c.application?.call_draft ? JSON.parse(c.application.call_draft) : null;
        } catch {}
        const k = [...callRows]
          .filter((x) => (x as { meet_space?: string | null }).meet_space && x.status !== "cancelled")
          .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at))[0];
        return (
          <RO edit={canEdit}>
            <CallDraftPanel candidateId={c.id} callId={k?.id ?? null} madeAt={d?.made_at ?? null} notes={d?.private_notes ?? null} />
          </RO>
        );
      })()}
      <PositionsTheyFit candidateId={c.id} status={c.status} />
      {c.status === "listed" && c.headline && (
        <PointToOwner candidateId={c.id} headline={c.headline} link={`${siteUrl().replace(/^https?:\/\//, "")}/c/${refCode(c.id)}`} repFirst={(me.name || "").split(" ")[0]} mine={canEdit && !me.manager} />
      )}
      <PointedLog candidateId={c.id} />
      <RO edit={canEdit}>
      <ResumePanel
        candidateId={c.id}
        hasResume={!!(c as { resume_path?: string | null }).resume_path}
        replaced={!!c.application?.original_resume_path}
        originalAt={c.application?.original_resume_at ?? null}
        clean={cleanResumeOf(c.application)}
        ownerSees={c.application?.owner_resume === "clean" && c.application?.clean_resume ? "clean" : "original"}
        noResume={c.application?.no_resume === "yes"}
      />
      </RO>
      {canEdit && me.id && <CallNow candidateId={c.id} first={c.full_name.split(" ")[0]} callEmail={await callEmailFor({ id: me.id, email: me.email })} />}
      {canEdit && <ReminderPanel c={c} hasCall={callRows.some((k) => k.status !== "cancelled")} />}
      <RO edit={canEdit}>
        <CandidateForm c={c} tierFeeLabel={tierFee != null ? money(tierFee) : "set by hand"} isAdmin={me.role === "admin"} />
      </RO>
      {me.role === "admin" && (
        <details className="panel" style={{ marginTop: 32, borderColor: "var(--rust-soft)" }} open={typeof sp.delete_error === "string"}>
          <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--rust)" }}>Delete this candidate</summary>
          {(unlocks ?? []).length > 0 ? (
            <p className="small" style={{ marginTop: 10 }}>
              A client has signed for this candidate, so their record has to stay for your agreements and payments. To
              take them off the site, set the status to <strong>Archived</strong> above.
            </p>
          ) : (
            <form action={deleteCandidate.bind(null, c.id)} style={{ marginTop: 12, display: "grid", gap: 10, maxWidth: 420 }}>
              <p className="small" style={{ margin: 0 }}>
                Permanently removes {c.full_name}, their resume and any booked calls. Use this for test entries or
                mistakes. It can&rsquo;t be undone.
              </p>
              <label className="field">
                <span>Type DELETE to confirm</span>
                <input className="input" name="confirm" autoComplete="off" />
              </label>
              {typeof sp.delete_error === "string" && (
                <p className="notice notice-bad" role="alert" style={{ margin: 0 }}>
                  {sp.delete_error}
                </p>
              )}
              <button className="btn btn-danger" type="submit" style={{ justifySelf: "start" }}>
                Delete permanently
              </button>
            </form>
          )}
        </details>
      )}
    </>
  );
}

async function RepRow({ candidateId, addedBy, admin, meId }: { candidateId: string; addedBy: string | null; admin: boolean; meId: string | null }) {
  const [options, reps] = await Promise.all([repOptions(), effectiveReps([{ id: candidateId, added_by: addedBy }])]);
  const r = reps.get(candidateId);
  // Reps can hand off their own candidates. On anyone else's, they just see who the rep is.
  if (!admin && (!meId || r?.id !== meId)) {
    const name = options.find(([id]) => id === r?.id)?.[1];
    return (
      <p style={{ marginTop: 10 }}>
        <strong>Rep:</strong> {name?.split(" (")[0] ?? "Not assigned"}
      </p>
    );
  }
  return (
    <p style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <strong>Rep:</strong>
      <RepPicker candidateId={candidateId} value={r?.id ?? ""} options={options} note={!admin ? "Did another rep send them? Pick that rep here." : r?.viaCall ? "from their onboarding call" : undefined} />
    </p>
  );
}

function PromiseRow({
  c,
}: {
  c: Candidate & { promise_signed_at?: string | null; promise_name?: string | null; promise_requested_at?: string | null; list_on_sign?: boolean };
}) {
  if (!("promise_signed_at" in c)) return null;
  if (c.promise_signed_at)
    return (
      <p style={{ marginTop: 10 }}>
        <strong>Candidate agreement:</strong> signed by {c.promise_name} on {dateShort(c.promise_signed_at)}.
      </p>
    );
  if (!c.promise_requested_at)
    return c.status === "listed" ? (
      <form action={resendPromise.bind(null, c.id)} style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span>
          <strong>Candidate agreement:</strong> not sent yet. Mention it to them, then send it.
        </span>
        <SendButton label="Send the candidate agreement" />
      </form>
    ) : null;
  return (
    <form action={resendPromise.bind(null, c.id)} style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <span>
        <strong>Candidate agreement:</strong> sent {dateShort(c.promise_requested_at)}, not signed yet.
        {c.list_on_sign ? " Their profile goes live the moment they sign." : ""}
      </span>
      <SendButton label="Send it again" />
    </form>
  );
}

async function ReminderPanel({ c, hasCall }: { c: Candidate; hasCall: boolean }) {
  const x = c as Candidate & { promise_signed_at?: string | null; working_genius?: string | null; resume_path?: string | null };
  const { data: sent } = await db()
    .from("activity_log")
    .select("at, details")
    .eq("action", "candidate_reminder")
    .eq("details->>candidate", refCode(c.id))
    .order("at", { ascending: false })
    .limit(30);
  const last = (kind: string) => {
    const row = (sent ?? []).find((r) => (r.details as { kind?: string })?.kind === kind);
    return row ? dateShort(row.at) : null;
  };
  const options: ReminderOption[] = [];
  if (!x.working_genius)
    options.push({ kind: "assessment", label: "Take our Strengths Assessment", hint: "A link to our free assessment. Their result lands on their profile by itself.", lastSent: last("assessment") });
  if (!hasCall)
    options.push({ kind: "book", label: "Book their call", hint: "A link to pick a time for their call with you.", lastSent: last("book") });
  if (x.promise_signed_at === null)
    options.push({ kind: "agreement", label: "Sign their candidate agreement", hint: "Sends their agreement to sign. It takes about 30 seconds.", lastSent: last("agreement") });
  options.push({ kind: "resume", label: "Send their latest resume", hint: x.resume_path ? "Asks them to reply with an updated resume." : "Asks them to reply with their resume. We don't have one yet.", lastSent: last("resume") });
  return <Reminders candidateId={c.id} first={c.full_name.split(" ")[0]} options={options} />;
}

// On another rep's candidate: say so, plainly, at the top.
async function ViewOnly({ candidateId, addedBy }: { candidateId: string; addedBy: string | null }) {
  const [options, reps] = await Promise.all([repOptions(), effectiveReps([{ id: candidateId, added_by: addedBy }])]);
  const r = reps.get(candidateId);
  const name = options.find(([id]) => id === r?.id)?.[1] ?? "Another rep";
  return (
    <p className="notice notice-gold" style={{ marginTop: 10 }}>
      <strong>{name.split(" (")[0]}&rsquo;s candidate: view only.</strong> You can see everything here; only their rep or Heshy can change it.
    </p>
  );
}

// Another rep's candidate: everything shows, but every button and field is switched off.
function RO({ edit, children }: { edit: boolean; children: React.ReactNode }) {
  return edit ? <>{children}</> : <fieldset disabled style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>{children}</fieldset>;
}

// Who this candidate has been sent to, so nobody sends them to the same owner twice.
async function PointedLog({ candidateId }: { candidateId: string }) {
  const { data } = await db().from("activity_log").select("at, details").eq("action", "candidate_pointed").eq("details->>candidate_id", candidateId).order("at", { ascending: false }).limit(20);
  const rows = (data ?? []) as { at: string; details: { to_name?: string | null; to_key?: string; channel?: string; by_name?: string } }[];
  if (!rows.length) return null;
  return (
    <p className="small muted" style={{ marginTop: 8 }}>
      Passed along to:{" "}
      {rows
        .map((r) => `${r.details.to_name || r.details.to_key} (${r.details.channel === "whatsapp" ? "WhatsApp" : r.details.channel}, by ${(r.details.by_name ?? "").split(" ")[0]}, ${dateShort(r.at)})`)
        .join(" · ")}
    </p>
  );
}
