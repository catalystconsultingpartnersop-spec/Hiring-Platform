import { db } from "@/lib/db";
import styles from "../admin.module.css";

type Row = { id: number; at: string; actor: string; action: string; details: Record<string, unknown> };

export default async function ActivityPage() {
  const { data } = await db().from("activity_log").select("*").order("at", { ascending: false }).limit(300);
  const rows = (data ?? []) as Row[];
  return (
    <>
      <div className="page-head" style={{ paddingBottom: 8 }}>
        <h1>Activity</h1>
        <p>Every sign-in, signature, payment and change, newest first. The last 300 are shown.</p>
      </div>
      <div className="table-wrap">
        <table className={`table ${styles.log}`}>
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>What</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ whiteSpace: "nowrap" }}>
                  {new Date(r.at).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" })}
                </td>
                <td>{r.actor}</td>
                <td>{r.action.replace(/_/g, " ")}</td>
                <td>
                  <code>{Object.keys(r.details ?? {}).length ? JSON.stringify(r.details) : ""}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
