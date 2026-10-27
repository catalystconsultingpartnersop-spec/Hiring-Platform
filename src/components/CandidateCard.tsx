import Link from "next/link";
import type { PublicCandidate } from "@/lib/db";
import { LEVEL_LABEL, WORK_MODE_LABEL, money, refCode, salaryRange } from "@/lib/format";

export function Strengths({ items, strong = false }: { items: string[]; strong?: boolean }) {
  if (!items.length) return null;
  return (
    <>
      {items.map((s, i) => (
        <span key={s + i}>
          <span className={strong ? "hl hl-strong" : "hl"}>{s}</span>
          {i < items.length - 1 ? ", " : ""}
        </span>
      ))}
    </>
  );
}

export function CandidateCard({
  c,
  fee,
  href,
  example = false,
}: {
  c: PublicCandidate;
  fee: number | null;
  href?: string;
  example?: boolean;
}) {
  const salary = salaryRange(c.salary_min, c.salary_max);
  const meta = [
    c.level ? LEVEL_LABEL[c.level] : null,
    c.location_region,
    c.work_mode ? WORK_MODE_LABEL[c.work_mode] : null,
    salary,
  ].filter(Boolean) as string[];

  const body = (
    <>
      <div className="card-top">
        <span>{[c.role_category, c.industry].filter(Boolean).join(" in ")}</span>
        <span className="card-ref">{example ? "Example" : refCode(c.id)}</span>
      </div>
      <h3>{c.headline}</h3>
      {c.strengths.length > 0 && (
        <p className="card-wired">
          <span className="lead">Wired for</span>
          <Strengths items={c.strengths} />
        </p>
      )}
      {meta.length > 0 && (
        <div className="card-meta">
          {meta.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      )}
      <div className="card-foot">
        <span className="muted">Flat fee if you hire</span>
        <strong>{fee != null ? money(fee) : "Ask"}</strong>
      </div>
    </>
  );

  if (!href) return <div className="card">{body}</div>;
  return (
    <Link className="card" href={href}>
      {body}
    </Link>
  );
}
