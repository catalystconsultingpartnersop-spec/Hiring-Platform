import Link from "next/link";
import { CandidateCard } from "@/components/CandidateCard";
import {
  allListed,
  applyFilters,
  CatalogFilters,
  facetCounts,
  getTiers,
  PAY_BANDS,
} from "@/lib/catalog";
import { feeFor, LEVEL_LABEL, WORK_MODE_LABEL } from "@/lib/format";
import { TRAIT_LIST, TRAITS } from "@/lib/strengths";
import styles from "./catalog.module.css";
import { FiltersToggle } from "./FiltersToggle";
import { SortSelect } from "./SortSelect";

export const dynamic = "force-dynamic";

const KEYS = ["q", "role", "level", "mode", "region", "strength", "pay", "saved", "sort"] as const;

function href(f: CatalogFilters, change: Partial<CatalogFilters>) {
  const next = { ...f, ...change };
  const sp = new URLSearchParams();
  for (const k of KEYS) if (next[k]) sp.set(k, next[k]!);
  const s = sp.toString();
  return s ? `/candidates?${s}` : "/candidates";
}

export default async function Catalog({ searchParams }: PageProps<"/candidates">) {
  const sp = await searchParams;
  const f: CatalogFilters = {};
  for (const k of KEYS) if (typeof sp[k] === "string" && sp[k]) f[k] = sp[k] as string;

  const [{ rows: all }, tiers] = await Promise.all([allListed(), getTiers()]);
  const feeOf = (c: (typeof all)[number]) => feeFor(c, tiers);
  const rows = applyFilters(all, f, feeOf);

  const roleCounts = facetCounts(all, f, "role");
  const allRoles = [...new Set(all.map((c) => c.role_category).filter((r): r is string => !!r))].sort();
  const regions = [...facetCounts(all, f, "region").entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const shortlistView = !!f.saved;

  const active: [keyof CatalogFilters, string][] = [];
  if (f.strength && f.strength in TRAITS) active.push(["strength", `Best at: ${TRAITS[f.strength as keyof typeof TRAITS].label}`]);
  if (f.level) active.push(["level", LEVEL_LABEL[f.level] ?? f.level]);
  if (f.pay) active.push(["pay", PAY_BANDS.find((b) => b[0] === f.pay)?.[1] ?? f.pay]);
  if (f.mode) active.push(["mode", WORK_MODE_LABEL[f.mode] ?? f.mode]);
  if (f.region) active.push(["region", f.region]);
  if (f.q) active.push(["q", `“${f.q}”`]);

  return (
    <>
      <div className={styles.searchBand}>
        <div className="wrap">
          <form className={styles.search} method="get" action="/candidates" role="search">
            {f.role && <input type="hidden" name="role" value={f.role} />}
            <label className="sr-only" htmlFor="q">
              Search candidates
            </label>
            <input
              id="q"
              className={styles.searchInput}
              type="search"
              name="q"
              defaultValue={f.q ?? ""}
              placeholder="Search by role, strength or industry, e.g. “numbers” or “closer”"
            />
            <button className="btn btn-gold" type="submit">
              Search
            </button>
          </form>
          <nav className={styles.departments} aria-label="Departments">
            <Link href={href(f, { role: undefined, saved: undefined })} aria-current={!f.role && !shortlistView ? "page" : undefined}>
              All candidates
            </Link>
            {allRoles.map((r) => (
              <Link key={r} href={href(f, { role: r, saved: undefined })} aria-current={f.role === r ? "page" : undefined}>
                {r} <span>{roleCounts.get(r) ?? 0}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className={`wrap ${styles.layout}`}>
        <FiltersToggle active={active.length}>
          <aside className={styles.rail} aria-label="Filters">
            <Facet title="Best at" note="Their two strongest ways of working">
              {TRAIT_LIST.map((t) => (
                <FacetLink
                  key={t.key}
                  on={f.strength === t.key}
                  n={facetCounts(all, f, "strength").get(t.key) ?? 0}
                  href={href(f, { strength: f.strength === t.key ? undefined : t.key })}
                >
                  {t.label}
                  <small>{t.short}</small>
                </FacetLink>
              ))}
            </Facet>
            <Facet title="Experience">
              {Object.entries(LEVEL_LABEL).map(([v, label]) => (
                <FacetLink
                  key={v}
                  on={f.level === v}
                  n={facetCounts(all, f, "level").get(v) ?? 0}
                  href={href(f, { level: f.level === v ? undefined : v })}
                >
                  {label}
                </FacetLink>
              ))}
            </Facet>
            <Facet title="Salary they want">
              {PAY_BANDS.map(([v, label]) => (
                <FacetLink
                  key={v}
                  on={f.pay === v}
                  n={facetCounts(all, f, "pay").get(v) ?? 0}
                  href={href(f, { pay: f.pay === v ? undefined : v })}
                >
                  {label}
                </FacetLink>
              ))}
            </Facet>
            <Facet title="Work setting">
              {Object.entries(WORK_MODE_LABEL).map(([v, label]) => (
                <FacetLink
                  key={v}
                  on={f.mode === v}
                  n={facetCounts(all, f, "mode").get(v) ?? 0}
                  href={href(f, { mode: f.mode === v ? undefined : v })}
                >
                  {label}
                </FacetLink>
              ))}
            </Facet>
            <Facet title="Location">
              {regions.map(([v, n]) => (
                <FacetLink key={v} on={f.region === v} n={n} href={href(f, { region: f.region === v ? undefined : v })}>
                  {v}
                </FacetLink>
              ))}
            </Facet>
          </aside>
        </FiltersToggle>

        <section aria-live="polite">
          <div className={styles.resultsHead}>
            <h1>
              {shortlistView ? "Your shortlist" : f.role ?? "All candidates"}
              <span>
                {rows.length} {rows.length === 1 ? "candidate" : "candidates"}
              </span>
            </h1>
            <SortSelect value={f.sort ?? ""} />
          </div>
          {active.length > 0 && (
            <div className={styles.chips}>
              {active.map(([k, label]) => (
                <Link key={k} href={href(f, { [k]: undefined })} className={styles.chip} aria-label={`Remove filter ${label}`}>
                  {label} <span aria-hidden="true">×</span>
                </Link>
              ))}
              <Link href={href({}, { role: f.role, sort: f.sort })} className="small">
                Clear all
              </Link>
            </div>
          )}
          {rows.length > 0 ? (
            <div className="cards">
              {rows.map((c) => (
                <CandidateCard key={c.id} c={c} fee={feeOf(c)} href={`/candidates/${c.id}`} />
              ))}
            </div>
          ) : (
            <div className="panel panel-wash">
              <p>
                {shortlistView
                  ? "Your shortlist is empty. Tap the heart on any candidate to save them here while you browse."
                  : all.length === 0
                    ? "New candidates are being coached and will be listed here soon. Check back shortly."
                    : "No one matches all of those filters. Remove one to see more people."}
              </p>
              <Link className="btn btn-small" href="/candidates" style={{ marginTop: 14 }}>
                See all candidates
              </Link>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Facet({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className={styles.facet}>
      <h2>{title}</h2>
      {note && <p className={styles.facetNote}>{note}</p>}
      <ul>{children}</ul>
    </div>
  );
}

function FacetLink({ on, n, href, children }: { on: boolean; n: number; href: string; children: React.ReactNode }) {
  if (!on && n === 0) {
    return (
      <li className={styles.facetEmpty}>
        <span className={styles.box} aria-hidden="true" />
        <span className={styles.facetLabel}>{children}</span>
      </li>
    );
  }
  return (
    <li>
      <Link href={href} aria-current={on ? "true" : undefined} className={on ? styles.facetOn : undefined}>
        <span className={styles.box} aria-hidden="true" />
        <span className={styles.facetLabel}>{children}</span>
        <span className={styles.count}>{n}</span>
      </Link>
    </li>
  );
}
