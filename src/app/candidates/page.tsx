import Link from "next/link";
import { CandidateCard } from "@/components/CandidateCard";
import { filterOptions, getTiers, listListed } from "@/lib/catalog";
import { feeFor, LEVEL_LABEL, WORK_MODE_LABEL } from "@/lib/format";
import styles from "./catalog.module.css";
import { FiltersToggle } from "./FiltersToggle";

export const dynamic = "force-dynamic";

export default async function Catalog({ searchParams }: PageProps<"/candidates">) {
  const sp = await searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const filters = {
    q: pick("q"),
    role: pick("role"),
    industry: pick("industry"),
    level: pick("level"),
    mode: pick("mode"),
    region: pick("region"),
  };

  const [all, rows, tiers] = await Promise.all([listListed(), listListed(filters), getTiers()]);
  const opts = filterOptions(all);
  const filtered = Object.values(filters).some(Boolean);

  return (
    <div className="wrap">
      <div className="page-head">
        <h1>Candidates</h1>
        <p>
          Coached, assessed, and ready to work. Open a profile to read more; sign the agreement to see who
          they are.
        </p>
      </div>

      <div className={styles.layout}>
        <FiltersToggle active={Object.values(filters).filter(Boolean).length}>
        <form className={styles.filters} method="get" aria-label="Filter candidates">
          <label className="field">
            <span>Search</span>
            <input className="input" type="search" name="q" defaultValue={filters.q} placeholder="e.g. numbers, closer" />
          </label>
          <Select name="role" label="Role" value={filters.role} options={opts.roles.map((r) => [r, r])} />
          <Select
            name="level"
            label="Experience"
            value={filters.level}
            options={Object.entries(LEVEL_LABEL)}
          />
          <Select name="industry" label="Industry" value={filters.industry} options={opts.industries.map((r) => [r, r])} />
          <Select name="region" label="Location" value={filters.region} options={opts.regions.map((r) => [r, r])} />
          <Select name="mode" label="Work setting" value={filters.mode} options={Object.entries(WORK_MODE_LABEL)} />
          <div className={styles.filterActions}>
            <button className="btn btn-small" type="submit">
              Show results
            </button>
            {filtered && (
              <Link href="/candidates" className="small">
                Clear filters
              </Link>
            )}
          </div>
        </form>
        </FiltersToggle>

        <section aria-live="polite">
          <p className={`muted small ${styles.count}`}>
            {rows.length} {rows.length === 1 ? "candidate" : "candidates"}
            {filtered ? " match your filters" : " listed"}
          </p>
          {rows.length > 0 ? (
            <div className="cards">
              {rows.map((c) => (
                <CandidateCard key={c.id} c={c} fee={feeFor(c, tiers)} href={`/candidates/${c.id}`} />
              ))}
            </div>
          ) : (
            <div className="panel panel-wash">
              <p>
                {filtered
                  ? "No one matches those filters yet. Try removing one, or check back soon as new candidates are listed every week."
                  : "New candidates are being coached and will be listed soon. Check back shortly."}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Select({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: [string, string][];
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select className="select" name={name} defaultValue={value}>
        <option value="">Any</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
