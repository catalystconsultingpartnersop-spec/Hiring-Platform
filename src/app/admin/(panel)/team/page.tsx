import { db } from "@/lib/db";
import { dateShort } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { setStaffActive, setStaffRole } from "../../actions";
import { AddStaffForm } from "./AddStaffForm";

type Member = {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "rep";
  active: boolean;
  last_login_at: string | null;
};

export default async function TeamPage() {
  const me = await requireAdmin();
  const { data, error } = await db().from("staff").select("*").order("created_at");
  const members = (data ?? []) as Member[];

  const { data: counts } = await db().from("candidates").select("added_by").not("added_by", "is", null);
  const added = new Map<string, number>();
  for (const r of counts ?? []) added.set(r.added_by, (added.get(r.added_by) ?? 0) + 1);

  return (
    <div style={{ maxWidth: 820 }}>
      <div className="page-head" style={{ paddingBottom: 8 }}>
        <h1>Team</h1>
        <p>
          Reps can add and update candidates. They don&rsquo;t see fees, payments, refunds or this page. Everyone signs
          in with an emailed link.
        </p>
      </div>

      {error && (
        <p className="notice notice-bad" role="alert">
          The team list isn&rsquo;t set up in the database yet. Run the team setup in Supabase, then refresh.
        </p>
      )}

      <AddStaffForm />

      {members.length > 0 && (
        <div className="table-wrap" style={{ marginTop: 28 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Candidates added</th>
                <th>Last signed in</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const self = m.id === me.id;
                return (
                  <tr key={m.id} style={m.active ? undefined : { opacity: 0.55 }}>
                    <td>
                      <strong>{m.full_name || m.email}</strong>
                      <div className="small muted">{m.email}</div>
                    </td>
                    <td>
                      {m.role === "admin" ? <span className="tag tag-gold">Admin</span> : <span className="tag">Rep</span>}
                      {!m.active && <span className="tag" style={{ marginLeft: 6 }}>Switched off</span>}
                    </td>
                    <td>{added.get(m.id) ?? 0}</td>
                    <td>{dateShort(m.last_login_at)}</td>
                    <td>
                      {self ? (
                        <span className="small muted">You</span>
                      ) : (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <form action={setStaffActive.bind(null, m.id, !m.active)}>
                            <button className={`btn btn-small ${m.active ? "btn-danger" : "btn-ghost"}`} type="submit">
                              {m.active ? "Switch off" : "Turn back on"}
                            </button>
                          </form>
                          {m.active && (
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
