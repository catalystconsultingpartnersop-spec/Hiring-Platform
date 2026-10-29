import Link from "next/link";
import { db } from "@/lib/db";
import { dateShort } from "@/lib/format";
import { isOwnerEmail, requireAdmin } from "@/lib/session";
import { minutesLabel } from "@/lib/time";
import { setStaffActive, setStaffRole } from "../../actions";
import { AddStaffForm } from "./AddStaffForm";

type Member = {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "rep";
  active: boolean;
  last_login_at: string | null;
  meeting_link: string | null;
  time_zone: string | null;
  agreement_signed_at?: string | null;
};

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
type Win = { staff_id: string; weekday: number; start_minute: number; end_minute: number };

// "Mon, Wed 9am–5pm; Fri 10am–2pm"
function hoursSummary(wins: Win[]) {
  if (!wins.length) return "";
  const groups = new Map<string, number[]>();
  for (const w of [...wins].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7))) {
    const k = `${minutesLabel(w.start_minute)}–${minutesLabel(w.end_minute)}`;
    groups.set(k, [...(groups.get(k) ?? []), w.weekday]);
  }
  return [...groups].map(([t, d]) => `${d.map((x) => DAY[x]).join(", ")} ${t}`).join("; ");
}

export default async function TeamPage() {
  const me = await requireAdmin();
  const { data, error } = await db().from("staff").select("*").order("created_at");
  const members = (data ?? []) as Member[];

  const { data: counts } = await db().from("candidates").select("added_by").not("added_by", "is", null);
  const added = new Map<string, number>();
  for (const r of counts ?? []) added.set(r.added_by, (added.get(r.added_by) ?? 0) + 1);

  const [{ data: winData }, { data: callData }] = await Promise.all([
    db().from("staff_availability").select("staff_id, weekday, start_minute, end_minute"),
    db().from("onboarding_calls").select("staff_id").eq("status", "booked").gte("starts_at", new Date().toISOString()),
  ]);
  const wins = (winData ?? []) as Win[];
  const upcoming = new Map<string, number>();
  for (const r of callData ?? []) upcoming.set(r.staff_id, (upcoming.get(r.staff_id) ?? 0) + 1);

  return (
    <div style={{ maxWidth: 1000 }}>
      <div className="page-head" style={{ paddingBottom: 8 }}>
        <h1>Team</h1>
        <p>
          Reps add and update candidates and take onboarding calls. They don&rsquo;t see fees, payments, refunds or
          this page. Admins see everything. You&rsquo;re the owner: no one can switch you off or change your role, and
          only you can add or remove admins.
        </p>
      </div>

      {error && (
        <p className="notice notice-bad" role="alert">
          The team list isn&rsquo;t set up in the database yet. Run the team setup in Supabase, then refresh.
        </p>
      )}

      <AddStaffForm canAddAdmin={me.owner} />

      {members.length > 0 && (
        <div className="table-wrap" style={{ marginTop: 28 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Call hours</th>
                <th>Added</th>
                <th>Calls ahead</th>
                <th>Last signed in</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const self = m.id === me.id;
                const owner = isOwnerEmail(m.email);
                const locked = owner || (m.role === "admin" && !me.owner);
                const mine = wins.filter((w) => w.staff_id === m.id);
                return (
                  <tr key={m.id} style={m.active ? undefined : { opacity: 0.55 }}>
                    <td>
                      <strong>
                        {owner ? m.full_name || m.email : <Link href={`/admin/team/${m.id}`}>{m.full_name || m.email}</Link>}
                      </strong>
                      <div className="small muted">{m.email}</div>
                    </td>
                    <td>
                      {owner ? (
                        <span className="tag tag-gold">Owner</span>
                      ) : m.role === "admin" ? (
                        <span className="tag tag-gold">Admin</span>
                      ) : (
                        <span className="tag">Rep</span>
                      )}
                      {!m.active && <span className="tag" style={{ marginLeft: 6 }}>Switched off</span>}
                      {!owner && m.role === "rep" && (
                        <div className="small" style={{ marginTop: 4 }}>
                          {m.agreement_signed_at ? (
                            <Link href={`/admin/agreement?id=${m.id}`}>Agreement signed {dateShort(m.agreement_signed_at)}</Link>
                          ) : (
                            <span className="muted">Agreement not signed yet</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="small">
                      {mine.length ? hoursSummary(mine) : <span className="muted">Not set</span>}
                      {mine.length > 0 && !m.meeting_link && <div style={{ color: "#b3261e" }}>No video link yet</div>}
                    </td>
                    <td>{added.get(m.id) ?? 0}</td>
                    <td>{upcoming.get(m.id) ?? 0}</td>
                    <td>{dateShort(m.last_login_at)}</td>
                    <td>
                      {self ? (
                        <span className="small muted">You</span>
                      ) : locked ? (
                        <span className="small muted">{owner ? "Owner" : "Only Heshy can change"}</span>
                      ) : (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <form action={setStaffActive.bind(null, m.id, !m.active)}>
                            <button className={`btn btn-small ${m.active ? "btn-danger" : "btn-ghost"}`} type="submit">
                              {m.active ? "Switch off" : "Turn back on"}
                            </button>
                          </form>
                          {m.active && (me.owner || m.role !== "admin") && (
                            <form action={setStaffRole.bind(null, m.id, m.role === "admin" ? "rep" : "admin")}>
                              <button className="btn btn-small btn-ghost" type="submit">
                                {m.role === "admin" ? "Make rep" : "Make admin"}
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
