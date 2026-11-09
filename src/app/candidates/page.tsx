import Link from "next/link";
import { currentOwner } from "@/lib/session";
import { OwnerMatchNote } from "@/components/OwnerMatchNote";
import { CandidateCard } from "@/components/CandidateCard";
import {
  allListed,
  applyFilters,
  CatalogFilters,
  facetCounts,
  getTiers,
  industriesOf,
  interviewingIds,
  rolesOf,
} from "@/lib/catalog";
import { CompareTray } from "@/components/Compare";
import { feeFor, LEVEL_LABEL, WORK_MODE_LABEL } from "@/lib/format";
import { TRAIT_LIST, TRAITS } from "@/lib/strengths";
import styles from "./catalog.module.css";
import { Pill } from "./Pill";

export const dynamic = "force-dynamic";

const KEYS = ["q", "role", "level", "mode", "region", "strength", "pay", "maxpay", "industry", "avail", "saved", "sort"] as const;

function href(f: CatalogFilters, change: Partial<CatalogFilters>) {
  const next = { ...f, ...change };
  const sp = new URLSearchParams();
  for (const k of KEYS) if (next[k]) sp.set(k, next[k]!);
  const s = sp.toString();
  return s ? `/candidates?${s}` : "/candidates";
}

export const metadata = { title: "Browse candidates" };

export default async function Catalog({ searchParams }: PageProps<"/candidates">) {
  const sp = await searchParams;
  const owner = await currentOwner().catch(() => null);
  const signedIn = !!owner;
  const f: CatalogFilters = {};
  for (const k of KEYS) if (typeof sp[k] === "string" && sp[k]) f[k] = sp[k] as string;

  const [{ rows: all }, tiers, busy] = await Promise.all([allListed(), getTiers(), interviewingIds()]);
  const feeOf = (c: (typeof all)[number]) => feeFor(c, tiers);
  const rows = applyFilters(all, f, feeOf);

  const roleCounts = facetCounts(all, f, "role");
  const allRoles = [...new Set(all.flatMap(rolesOf))].sort();
  const regions = [...facetCounts(all, f, "region").entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const industryCounts = facetCounts(all, f, "industry");
  const allIndustries = [...new Set(all.flatMap(industriesOf))].sort();
  const shortlistView = !!f.saved;
  // Saved candidates who have since been hired (or taken down) drop out of the list; say so.
  const goneFromShortlist = shortlistView
    ? (f.saved ?? "").split(",").filter((id) => id && id !== "none" && !all.some((c) => c.id === id)).length
    : 0;

  const active: [keyof CatalogFilters, string][] = [];
  if (f.strength && f.strength in TRAITS) active.push(["strength", `Best at: ${TRAITS[f.strength as keyof typeof TRAITS].label}`]);
  if (f.level) active.push(["level", LEVEL_LABEL[f.level] ?? f.level]);
  if (Number(f.maxpay) > 0) active.push(["maxpay", `Up to $${Math.round(Number(f.maxpay) / 1000)}k`]);
  if (f.mode) active.push(["mode", WORK_MODE_LABEL[f.mode] ?? f.mode]);
  if (f.region) active.push(["region", f.region]);
  if (f.industry) active.push(["industry", f.industry]);
  if (f.avail) active.push(["avail", "Available now"]);
  if (f.q) active.push(["q", `“${f.q}”`]);

  const roleLabel = f.role ?? "Role";
  const payLabel = Number(f.maxpay) > 0 ? `Up to $${Math.round(Number(f.maxpay) / 1000)}k` : "Pay";
  const sortLabel = SORTS.find(([v]) => v === (f.sort ?? ""))?.[1] ?? "Newest";
  const moreOn = [f.strength, f.level, f.mode, f.industry].filter(Boolean).length;

  return (
    <div className="card-shelf shelf-warm">
      <div className="wrap">
        {owner && !shortlistView && !Object.keys(f).length && <OwnerMatchNote ownerId={owner.id} />}
        <div className={styles.head}>
          <h1>{shortlistView ? "Your shortlist" : "Candidates we\u2019ve met and vouch for"}</h1>
          <p>
            {shortlistView
              ? `${rows.length} saved ${rows.length === 1 ? "candidate" : "candidates"}.`
              : "Every person here sat down one-on-one with our team. Browse freely."}
          </p>
        </div>

        <div className={styles.pills}>
          <Pill label={roleLabel} on={!!f.role}>
            <MenuLink href={href(f, { role: undefined, saved: undefined })} on={!f.role}>
              All roles <span>{all.length}</span>
            </MenuLink>
            {allRoles.map((r) => (
              <MenuLink key={r} href={href(f, { role: r, saved: undefined })} on={f.role === r}>
                {r} <span>{roleCounts.get(r) ?? 0}</span>
              </MenuLink>
            ))}
          </Pill>
          <Pill label={f.region ?? "Location"} on={!!f.region}>
            <MenuLink href={href(f, { region: undefined })} on={!f.region}>
              Anywhere
            </MenuLink>
            {regions.map(([v, n]) => (
              <MenuLink key={v} href={href(f, { region: v })} on={f.region === v}>
                {v} <span>{n}</span>
              </MenuLink>
            ))}
          </Pill>
          <Pill label={payLabel} on={Number(f.maxpay) > 0}>
            <MenuLink href={href(f, { maxpay: undefined })} on={!(Number(f.maxpay) > 0)}>
              Any salary
            </MenuLink>
            {BUDGETS.map((b) => (
              <MenuLink key={b} href={href(f, { maxpay: String(b) })} on={Number(f.maxpay) === b}>
                Up to ${b / 1000}k
              </MenuLink>
            ))}
          </Pill>
          <Link
            href={href(f, { avail: f.avail ? undefined : "now" })}
            className={`pill ${f.avail ? "pill-on" : ""}`}
            aria-pressed={!!f.avail}
          >
            {f.avail ? "✓ " : ""}Available now
          </Link>
          <Pill label={moreOn ? `More filters (${moreOn})` : "More filters"} on={moreOn > 0} wide>
            <MenuGroup title="Best at">
              {TRAIT_LIST.map((t) => (
                <MenuLink key={t.key} on={f.strength === t.key} href={href(f, { strength: f.strength === t.key ? undefined : t.key })}>
                  {t.label} <span>{facetCounts(all, f, "strength").get(t.key) ?? 0}</span>
                </MenuLink>
              ))}
            </MenuGroup>
            <MenuGroup title="Experience">
              {Object.entries(LEVEL_LABEL).map(([v, label]) => (
                <MenuLink key={v} on={f.level === v} href={href(f, { level: f.level === v ? undefined : v })}>
                  {label} <span>{facetCounts(all, f, "level").get(v) ?? 0}</span>
                </MenuLink>
              ))}
            </MenuGroup>
            <MenuGroup title="Work setting">
              {Object.entries(WORK_MODE_LABEL).map(([v, label]) => (
                <MenuLink key={v} on={f.mode === v} href={href(f, { mode: f.mode === v ? undefined : v })}>
                  {label} <span>{facetCounts(all, f, "mode").get(v) ?? 0}</span>
                </MenuLink>
              ))}
            </MenuGroup>
            {allIndustries.length > 0 && (
              <MenuGroup title="Industry">
                {allIndustries.map((v) => (
                  <MenuLink key={v} on={f.industry === v} href={href(f, { industry: f.industry === v ? undefined : v })}>
                    {v} <span>{industryCounts.get(v) ?? 0}</span>
                  </MenuLink>
                ))}
              </MenuGroup>
            )}
          </Pill>
          <form className={styles.search} method="get" action="/candidates" role="search">
            {f.role && <input type="hidden" name="role" value={f.role} />}
            <label className="sr-only" htmlFor="q">
              Search candidates
            </label>
            <input id="q" type="search" name="q" defaultValue={f.q ?? ""} placeholder="Search, e.g. “numbers”" />
          </form>
          <p className={styles.fee}>
            One flat fee: <strong>$5,000</strong>, only if you hire
          </p>
        </div>

        <div className={styles.countRow}>
          <span>
            {rows.length} {rows.length === 1 ? "candidate" : "candidates"}
          </span>
          {active.length > 0 && (
            <span className={styles.chips}>
              {active.map(([k, label]) => (
                <Link key={k} href={href(f, { [k]: undefined })} className={styles.chip} aria-label={`Remove filter ${label}`}>
                  {label} <span aria-hidden="true">×</span>
                </Link>
              ))}
              <Link href={href({}, { sort: f.sort })} className="small">
                Clear all
              </Link>
            </span>
          )}
          <Pill label={`Sort: ${sortLabel}`}>
            {SORTS.map(([v, l]) => (
              <MenuLink key={v} href={href(f, { sort: v || undefined })} on={(f.sort ?? "") === v}>
                {l}
              </MenuLink>
            ))}
          </Pill>
        </div>

        <section aria-live="polite">
          {goneFromShortlist > 0 && (
            <p className="notice notice-gold" role="status" style={{ marginBottom: 16 }}>
              {goneFromShortlist === 1
                ? "One person you saved is no longer available."
                : `${goneFromShortlist} people you saved are no longer available.`}{" "}
              Here&rsquo;s who&rsquo;s still on your list.
            </p>
          )}
          {shortlistView && !signedIn && (
            <p className="small muted" style={{ marginBottom: 12 }}>
              <Link href="/login">Sign in</Link> to keep your shortlist on any device. We&rsquo;ll email you if someone you saved
              is hired.
            </p>
          )}
          {rows.length > 0 ? (
            <div className="cards cards-intro">
              {rows.map((c) => (
                <CandidateCard key={c.id} c={c} fee={feeOf(c)} href={`/candidates/${c.id}`} store interviewing={busy.has(c.id)} />
              ))}
            </div>
          ) : (
            <div className="panel panel-wash">
              <p>
                {shortlistView
                  ? "Your shortlist is empty. Tap the heart on any candidate's page to save them here while you browse."
                  : all.length === 0
                    ? "New candidates are being coached and will be listed here soon. Check back shortly."
                    : f.q
                      ? `Nobody listed for “${f.q}” right now. Tell us what you need on the Contact us page, and we'll let you know when someone fits.`
                      : "No one matches all of those filters. Remove one to see more people."}
              </p>
              <Link className="btn btn-small" href="/candidates" style={{ marginTop: 14 }}>
                See all candidates
              </Link>
            </div>
          )}
        </section>
      </div>
      <CompareTray />
    </div>
  );
}

const BUDGETS = [60000, 80000, 100000, 130000, 175000];
const SORTS: [string, string][] = [
  ["", "Newest"],
  ["pay", "Salary: low to high"],
  ["pay-desc", "Salary: high to low"],
  ["experience", "Most experienced"],
];

function MenuLink({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={on ? "pill-item pill-item-on" : "pill-item"} aria-current={on ? "true" : undefined}>
      {children}
    </Link>
  );
}

function MenuGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pill-group">
      <p>{title}</p>
      {children}
    </div>
  );
}
