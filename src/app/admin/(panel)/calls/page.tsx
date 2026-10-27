import Link from "next/link";
import { ConfirmButton } from "@/components/ConfirmButton";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { COMPANY_TZ, formatInZone } from "@/lib/time";
import { cancelCallByStaff, markCall } from "../../actions";
import styles from "../admin.module.css";

type Row = {
  id: string;
  starts_at: string;
  status: string;
  staff_id: string;
  candidates: { id: string; full_name: string; email: string; phone: string | null; application: Record<string, string> };
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
    .select("id, starts_at, status, staff_id, candidates(id, full_name, email, phone, application), staff(full_name, email, meeting_link, time_zone)")
    .gte("starts_at", cutoff)
    .order("starts_at", { ascending: upcoming });
  if (staffId) q = q.eq("staff_id", staffId);
  if (upcoming) q = q.eq("status", "booked");
  else q = q.lt("starts_at", new Date().toISOString());
  const { data } = await q.limit(200);
  return (data ?? []) as unknown as Row[];
}

export default async function CallsPage() {
  const me = await requireStaff();
  const admin = me.role === "admin";
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
                  <Link href={`/admin/candidates/${r.candidates.id}`}>{r.candidates.full_name}</Link>
                  <div className="small muted">
                    {r.candidates.email}
                    {r.candidates.phone ? `, ${r.candidates.phone}` : ""}
                  </div>
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
                    {showActions && r.staff.meeting_link && (
                      <a className="btn btn-small btn-gold" href={r.staff.meeting_link} target="_blank" rel="noopener noreferrer">
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
      <h2 className={styles.h2}>Coming up</h2>
      {upcoming.length ? table(upcoming, true) : <p className="panel panel-wash">No calls booked yet.</p>}
      <h2 className={styles.h2}>Last two weeks</h2>
      {recent.length ? table(recent, false) : <p className="panel panel-wash">Nothing yet.</p>}
    </>
  );
}
