import type { Metadata } from "next";
import Link from "next/link";
import { bestAtText, roleLine } from "@/components/CandidateCard";
import { RoleCover } from "@/components/RoleCover";
import { ShortlistButton } from "@/components/Shortlist";
import { getListed, getTiers, industriesOf } from "@/lib/catalog";
import { feeFor, LEVEL_LABEL, money, salaryRange, WORK_MODE_LABEL } from "@/lib/format";
import { wiredFor } from "@/lib/strengths";
import type { PublicCandidate } from "@/lib/db";
import styles from "./compare.module.css";

export const metadata: Metadata = { title: "Compare candidates" };
export const dynamic = "force-dynamic";

export default async function Compare({ searchParams }: PageProps<"/candidates/compare">) {
  const sp = await searchParams;
  const ids = (typeof sp.ids === "string" ? sp.ids : "").split(",").filter(Boolean).slice(0, 3);
  const [found, tiers] = await Promise.all([Promise.all(ids.map((id) => getListed(id))), getTiers()]);
  const people = found.filter((c): c is PublicCandidate => !!c);

  const rows: [string, (c: PublicCandidate) => React.ReactNode][] = [
    ["Best at", (c) => bestAtText(c) ?? "—"],
    ["Wired for", (c) => wiredFor(c).join(", ") || "—"],
    ["Role", (c) => [c.role_category, ...(c.also_roles ?? [])].filter(Boolean).join(", ") || "—"],
    ["Industry", (c) => industriesOf(c).join(", ") || "—"],
    ["Experience", (c) => (c.level ? LEVEL_LABEL[c.level] : "—")],
    ["Location", (c) => c.location_region ?? "—"],
    ["Work setting", (c) => (c.work_mode ? WORK_MODE_LABEL[c.work_mode] : "—")],
    ["Salary they want", (c) => salaryRange(c.salary_min, c.salary_max) ?? "—"],
    ["Highlights", (c) => (c.highlights.length ? <ul>{c.highlights.slice(0, 3).map((h) => <li key={h}>{h}</li>)}</ul> : "—")],
  ];

  return (
    <div className={`wrap ${styles.page}`}>
      <Link href="/candidates" className="small">
        Back to all candidates
      </Link>
      <h1 className={styles.h1}>Compare candidates</h1>
      {people.length < 2 ? (
        <div className="panel panel-wash">
          <p>Pick two or three candidates to compare. Tick &ldquo;Compare&rdquo; on their cards while you browse.</p>
          <Link className="btn btn-small" href="/candidates" style={{ marginTop: 12 }}>
            Browse candidates
          </Link>
        </div>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table} style={{ ["--n" as string]: people.length }}>
            <thead>
              <tr>
                <th aria-label="What" />
                {people.map((c) => (
                  <th key={c.id} scope="col">
                    <RoleCover role={c.role_category} label={roleLine(c) || null} />
                    <Link href={`/candidates/${c.id}`} className={styles.name}>
                      {c.headline}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, cell]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {people.map((c) => (
                    <td key={c.id}>{cell(c)}</td>
                  ))}
                </tr>
              ))}
              <tr className={styles.feeRow}>
                <th scope="row">Flat fee if you hire</th>
                {people.map((c) => {
                  const fee = feeFor(c, tiers);
                  return (
                    <td key={c.id}>
                      <strong>{fee != null ? money(fee) : "Ask"}</strong>
                      <div className={styles.actions}>
                        <Link className="btn btn-gold btn-small" href={`/candidates/${c.id}/unlock`}>
                          See who this is
                        </Link>
                        <ShortlistButton id={c.id} />
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
