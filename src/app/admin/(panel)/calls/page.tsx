import { hiddenStaffIds } from "@/lib/hiddenStaff";
import { isCheckAccount } from "@/lib/session";
import Link from "next/link";
import { ConfirmButton } from "@/components/ConfirmButton";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { COMPANY_TZ, formatInZone } from "@/lib/time";
import { cancelCallByStaff, handCallToOwner, markCall } from "../../actions";
import { MoveCallForm } from "./MoveCallForm";
import styles from "../admin.module.css";

type Row = {
  id: string;
  starts_at: string;
  status: string;
  staff_id: string;
  meet_link?: string | null;
  candidates: { id: string; full_name: string; email: string; phone: string | null; application: Record<string, string>; added_by: string | null };
  staff: { full_name: string | null; email: string; meeting_link: string | null; time_zone: string | null };
};

const STATUS: Record<string, [string, string]> = {
  booked: ["Booked", "tag-gold"],
  done: ["Done", "tag-good"],
  no_show: ["No-show", "tag-bad"],
  cancelled: ["Cancelled", ""],
};

async function load(staffId: string | null, upcoming: boolean) {
  const cutoff = new Date(Date.now() - (upcoming ? 3600e3 : 14 * 864e5)).toISOString();
  let q = db()
    .from("onboarding_calls")
    .select("*, candidates(id, full_name, email, phone, application, added_by), staff(full_name, email, meeting_link, time_zone)")
    .gte("starts_at", cutoff)
    .order("starts_at", { ascending: upcoming });
  if (staffId) {
    // Their own calls, plus calls their candidates booked with someone else.
    const { data: mineC } = await db().from("candidates").select("id").eq("added_by", staffId);
    const ids = (mineC ?? []).map((c) => c.id as string);
    q = ids.length ? q.or(`staff_id.eq.${staffId},candidate_id.in.(${ids.join(",")})`) : q.eq("staff_id", staffId);
  }
  if (upcoming) q = q.eq("status", "booked");
  else q = q.lt("starts_at", new Date().toISOString());
  const { data } = await q.limit(200);
  return (data ?? []) as unknown as Row[];
}

export default async function CallsPage({ searchParams }: PageProps<"/admin/calls">) {
  const sp = await searchParams;
  const me = await requireStaff();
  const { data: staffRows } = await db().from("staff").select("id, full_name, email, active");
  const hidden = await hiddenStaffIds();
  const activeReps = ((staffRows ?? []) as { id: string; full_name: string | null; email: string; active: boolean }[]).filter((s) => s.active && !isCheckAccount(s.email) && !hidden.has(s.id));
  const nameOf = new Map(((staffRows ?? []) as { id: string; full_name: string | null; email: string }[]).map((s) => [s.id, (s.full_name || s.email).split(" ")[0]]));
  const admin = me.manager;
  const mine = admin ? null : me.id;
  const [upcoming, recent] = await Promise.all([load(mine, true), load(mine, false)]);

  const table = (rows: Row[], showActions: boolean) => (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>When</th>
            <th>Candidate</th>
            {admin && <th>Rep</th>}
            <th>Status</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const [label, cls] = STATUS[r.status] ?? [r.status, ""];
            return (
              <tr key={r.id}>
                <td style={{ whiteSpace: "nowrap" }}>
                  {formatInZone(r.starts_at, r.staff.time_zone ?? COMPANY_TZ, { weekday: "short", month: "short" })}
                </td>
                <td>
                  <Link prefetch={false} href={`/admin/candidates/${r.candidates.id}`}>{r.candidates.full_name}</Link>
                  <div className="small muted">
                    {r.candidates.email}
                    {r.candidates.phone ? `, ${r.candidates.phone}` : ""}
                  </div>
                  {r.candidates.added_by && r.candidates.added_by !== r.staff_id && (
                    <div className="small" style={{ marginTop: 4, color: "var(--rust)", fontWeight: 600 }}>
                      {nameOf.get(r.candidates.added_by) ?? "Another rep"}&rsquo;s candidate, booked with {nameOf.get(r.staff_id) ?? "someone else"}
                      {r.status === "booked" && (
                        <form action={handCallToOwner.bind(null, r.id)} style={{ display: "inline", marginLeft: 8 }}>
                          <button className="btn btn-small btn-ghost" type="submit">
                            Hand to {nameOf.get(r.candidates.added_by) ?? "their rep"}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                  {r.candidates.application?.looking_for && (
                    <div className="small" style={{ marginTop: 4, maxWidth: "48ch" }}>
                      {r.candidates.application.looking_for}
                    </div>
                  )}
                </td>
                {admin && <td>{r.staff.full_name || r.staff.email}</td>}
                <td>
                  <span className={`tag ${cls}`}>{label}</span>
                </td>
                <td>
                  <div className={styles.inline}>
                    {showActions && (r.meet_link || r.staff.meeting_link) && (
                      <a className="btn btn-small btn-gold" href={(r.meet_link || r.staff.meeting_link)!} target="_blank" rel="noopener noreferrer">
                        Join
                      </a>
                    )}
                    {r.status === "booked" && (
                      <>
                        <form action={markCall.bind(null, r.id, "done")}>
                          <button className="btn btn-small btn-ghost" type="submit">
                            Done
                          </button>
                        </form>
                        <form action={markCall.bind(null, r.id, "no_show")}>
                          <button className="btn btn-small btn-ghost" type="submit">
                            No-show
                          </button>
                        </form>
                        {showActions && admin && (
                          <MoveCallForm callId={r.id} currentRep={r.staff_id} reps={activeReps.map((s) => ({ id: s.id, name: s.full_name || s.email }))} />
                        )}
                        {showActions && (
                          <form action={cancelCallByStaff.bind(null, r.id)}>
                            <ConfirmButton
                              className="btn btn-small btn-danger"
                              message={`Cancel the call with ${r.candidates.full_name}? They'll get an email with a link to pick a new time.`}
                            >
                              Cancel
                            </ConfirmButton>
                          </form>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="page-head" style={{ paddingBottom: 8 }}>
        <h1>{admin ? "Onboarding calls" : "My calls"}</h1>
        <p>
          {admin ? "Every rep's calls." : "Calls candidates booked with you."} Set your available times on{" "}
          <Link href="/admin/hours">My hours</Link>.
        </p>
      </div>
      {sp.move === "done" && (
        <p className="notice notice-good">
          Moved. The reps were emailed{sp.told ? ", and so was the candidate" : "; the candidate wasn't told"}.
        </p>
      )}
      {sp.move === "outside" && (
        <p className="notice notice-gold">
          Moved{sp.told ? " and the candidate was told" : " quietly"}, but that time isn&rsquo;t in the new rep&rsquo;s hours. Make sure they can take it.
        </p>
      )}
      {sp.move === "busy" && <p className="notice notice-bad">That rep already has a call at that time. Nothing was moved.</p>}
      {sp.hand === "done" && <p className="notice notice-good">Done. The call is now with the candidate&rsquo;s own rep, and everyone got fresh emails.</p>}
      {sp.hand === "busy" && <p className="notice notice-bad">That time isn&rsquo;t open in their rep&rsquo;s hours (or they already have a call then). Keep it as is, or have the candidate pick a new time with their rep.</p>}
      <h2 className={styles.h2}>Coming up</h2>
      {upcoming.length ? table(upcoming, true) : <p className="panel panel-wash">No calls booked yet.</p>}
      <h2 className={styles.h2}>Last two weeks</h2>
      {recent.length ? table(recent, false) : <p className="panel panel-wash">Nothing yet.</p>}
    </>
  );
}
