import Link from "next/link";
import { AgreementRow, latest } from "@/lib/adminData";
import { loadPath, pathState, STAGE_TEAM_LABEL } from "@/lib/path";
import { COMPANY_TZ, formatInZone } from "@/lib/time";
import styles from "./admin.module.css";

// Every live introduction (client + candidate) and where it stands, so the
// rep knows who to nudge. Closed ones (hired, passed) drop off.
export async function Introductions({ rows, now, title = "Introductions in progress" }: { rows: AgreementRow[]; now: number; title?: string }) {
  const signed = rows.filter((a) => a.confirmed_at);
  const paths = await loadPath(signed.map((a) => a.id));
  const live = signed
    .map((a) => ({
      a,
      p: pathState(a, paths, { hireStatus: latest(a.hires)?.status, candidateStatus: a.candidates.status, nowMs: now }),
    }))
    .filter(({ p }) => !["hired", "passed", "declined", "taken"].includes(p.stage));
  return (
    <div className="panel" style={{ marginTop: 20 }}>
      <h2 className={styles.h3}>{title}</h2>
      {live.length === 0 ? (
        <p className="small muted">None right now. When a client unlocks a candidate, you&rsquo;ll see each step here.</p>
      ) : (
        <div className="table-wrap" style={{ border: 0 }}>
          <table className="table" style={{ fontSize: 14 }}>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Client</th>
                <th>Where it stands</th>
              </tr>
            </thead>
            <tbody>
              {live.map(({ a, p }) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/admin/candidates/${a.candidate_id}`}>{a.candidates.full_name}</Link>
                  </td>
                  <td>
                    {a.owners.company}
                    <div className="small muted">
                      {a.owners.full_name}
                      {a.owners.phone ? `, ${a.owners.phone}` : ""}
                    </div>
                  </td>
                  <td>
                    <span className={`tag ${p.stage.endsWith("booked") ? "tag-good" : "tag-gold"}`}>{STAGE_TEAM_LABEL[p.stage]}</span>
                    {p.meeting?.starts_at && p.stage.endsWith("booked") && (
                      <div className="small muted" style={{ marginTop: 4 }}>
                        {formatInZone(p.meeting.starts_at, COMPANY_TZ, { weekday: "short", month: "short" })}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
