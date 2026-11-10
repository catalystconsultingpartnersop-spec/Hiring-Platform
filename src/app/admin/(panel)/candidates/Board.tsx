"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TRAIT_LIST, TRAITS, type Letter } from "@/lib/strengths";
import { WGChips } from "./WGChips";
import { RepPicker } from "./RepPicker";
import { dateShort } from "@/lib/format";

export type Row = {
  id: string;
  ref: string;
  name: string;
  email: string;
  repId: string;
  repNote?: string;
  status: string;
  headline: string | null;
  roles: string[];
  industries: string[];
  level: string | null;
  levelRank: number;
  place: string | null;
  mode: string | null;
  payMin: number | null;
  payMax: number | null;
  wg: string | null;
  assessment: "done" | "uploaded" | "missing";
  available: string | null;
  hours: string | null;
  rep: string | null;
  mine: boolean;
  gold: boolean;
  interest: number;
  added: string;
  listed: string | null;
};

const STATUS: [string, string][] = [
  ["listed", "Listed"],
  ["draft", "Drafts"],
  ["applied", "New applications"],
  ["paused", "Paused"],
  ["hired", "Hired"],
  ["archived", "Archived"],
];
const SORTS: [string, string][] = [
  ["new", "Newest first"],
  ["payLow", "Salary: low to high"],
  ["payHigh", "Salary: high to low"],
  ["senior", "Most experienced"],
  ["interest", "Most owner interest"],
  ["name", "Name A–Z"],
  ["role", "Role A–Z"],
];
const GROUPS: [string, string][] = [
  ["", "No grouping"],
  ["strength", "Natural strength"],
  ["role", "Role"],
  ["industry", "Industry"],
  ["level", "Experience"],
  ["pay", "Salary range"],
  ["place", "Location"],
  ["rep", "Rep"],
];

const k = (n: number) => `$${Math.round(n / 1000)}k`;
const pay = (r: Row) => (r.payMin && r.payMax ? `${k(r.payMin)}–${k(r.payMax)}` : r.payMin ? `${k(r.payMin)}+` : r.payMax ? `up to ${k(r.payMax)}` : null);
const payMid = (r: Row) => (r.payMin && r.payMax ? (r.payMin + r.payMax) / 2 : (r.payMin ?? r.payMax ?? null));
const band = (r: Row) => {
  const m = payMid(r);
  if (m == null) return "No salary listed";
  if (m < 50000) return "Under $50k";
  if (m < 75000) return "$50k–$75k";
  if (m < 100000) return "$75k–$100k";
  if (m < 150000) return "$100k–$150k";
  return "$150k and up";
};
const BAND_ORDER = ["Under $50k", "$50k–$75k", "$75k–$100k", "$100k–$150k", "$150k and up", "No salary listed"];
const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b));
const nice = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export type Start = { status: string[]; q?: string; gold?: boolean; mine?: boolean };

export function Board({ rows, start, repOptions }: { rows: Row[]; start: Start; repOptions: [string, string][] | null }) {
  const [status, setStatus] = useState<string[]>(start.status);
  const [q, setQ] = useState(start.q ?? "");
  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [strength, setStrength] = useState("");
  const [level, setLevel] = useState("");
  const [place, setPlace] = useState("");
  const [rep, setRep] = useState("");
  const [maxPay, setMaxPay] = useState("");
  const [hours, setHours] = useState("");
  const [only, setOnly] = useState<string[]>([...(start.gold ? ["gold"] : []), ...(start.mine ? ["mine"] : [])]);
  const [sort, setSort] = useState("new");
  const [group, setGroup] = useState("");

  const roles = useMemo(() => uniq(rows.flatMap((r) => r.roles.map(nice))), [rows]);
  const industries = useMemo(() => uniq(rows.flatMap((r) => r.industries.map(nice))), [rows]);
  const places = useMemo(() => uniq(rows.map((r) => r.place && nice(r.place))), [rows]);
  const reps = useMemo(() => uniq(rows.map((r) => r.rep)), [rows]);
  const levels = useMemo(() => uniq(rows.map((r) => r.level)), [rows]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (status.length && !status.includes(r.status)) return false;
      if (role && !r.roles.some((x) => nice(x) === role)) return false;
      if (industry && !r.industries.some((x) => nice(x) === industry)) return false;
      if (strength && !(r.wg ?? "").slice(0, 2).includes(strength)) return false;
      if (level && r.level !== level) return false;
      if (place && nice(r.place ?? "") !== place) return false;
      if (rep && r.rep !== rep) return false;
      if (maxPay && (payMid(r) ?? Infinity) > Number(maxPay)) return false;
      if (hours && !(r.hours === hours || r.hours === "either")) return false;
      if (only.includes("gold") && !r.gold) return false;
      if (only.includes("assessed") && r.assessment !== "done") return false;
      if (only.includes("mine") && !r.mine) return false;
      if (only.includes("interest") && !r.interest) return false;
      if (t && ![r.name, r.email, r.ref, r.headline, ...r.roles, ...r.industries, r.place].join(" ").toLowerCase().includes(t)) return false;
      return true;
    });
    const by: Record<string, (a: Row, b: Row) => number> = {
      new: (a, b) => (b.listed ?? b.added).localeCompare(a.listed ?? a.added),
      payLow: (a, b) => (payMid(a) ?? 1e9) - (payMid(b) ?? 1e9),
      payHigh: (a, b) => (payMid(b) ?? -1) - (payMid(a) ?? -1),
      senior: (a, b) => b.levelRank - a.levelRank,
      interest: (a, b) => b.interest - a.interest,
      name: (a, b) => a.name.localeCompare(b.name),
      role: (a, b) => (a.roles[0] ?? "~").localeCompare(b.roles[0] ?? "~"),
    };
    out = [...out].sort(by[sort] ?? by.new);
    return out;
  }, [rows, status, q, role, industry, strength, level, place, rep, maxPay, hours, only, sort]);

  const groups = useMemo(() => {
    if (!group) return [["", shown]] as [string, Row[]][];
    const m = new Map<string, Row[]>();
    const add = (key: string, r: Row) => m.set(key, [...(m.get(key) ?? []), r]);
    for (const r of shown) {
      if (group === "strength") {
        const top = (r.wg ?? "").slice(0, 2).split("") as Letter[];
        if (!top.length) add("Assessment not taken yet", r);
        for (const l of top) add(TRAITS[l].label, r);
      } else if (group === "role") (r.roles.length ? r.roles : ["No role yet"]).forEach((x) => add(nice(x), r));
      else if (group === "industry") (r.industries.length ? r.industries : ["Any industry"]).forEach((x) => add(nice(x), r));
      else if (group === "level") add(r.level ?? "Experience not set", r);
      else if (group === "pay") add(band(r), r);
      else if (group === "place") add(r.place ? nice(r.place) : "No location", r);
      else if (group === "rep") add(r.rep ?? "No rep", r);
    }
    const keys = [...m.keys()].sort((a, b) =>
      group === "pay" ? BAND_ORDER.indexOf(a) - BAND_ORDER.indexOf(b) : (m.get(b)!.length - m.get(a)!.length) || a.localeCompare(b),
    );
    return keys.map((key) => [key, m.get(key)!] as [string, Row[]]);
  }, [shown, group]);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const anyFilter = role || industry || strength || level || place || rep || maxPay || hours || only.length || q;
  const clear = () => {
    setHours(""); setRole(""); setIndustry(""); setStrength(""); setLevel(""); setPlace(""); setRep(""); setMaxPay(""); setOnly([]); setQ("");
  };


  return (
    <div className="bd">
      <div className="bd-status">
        {STATUS.map(([v, l]) => (
          <button key={v} type="button" className={`bd-chip ${status.includes(v) ? "on" : ""}`} onClick={() => toggle(status, setStatus, v)}>
            {l} <span>{rows.filter((r) => r.status === v).length}</span>
          </button>
        ))}
      </div>

      <div className="bd-filters">
        <label className="bd-field bd-search">
          <span>Search</span>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, ref, role, word in headline…" />
        </label>
        <Sel label="Role" value={role} set={setRole} opts={roles} />
        <Sel label="Industry" value={industry} set={setIndustry} opts={industries} />
        <Sel label="Natural strength" value={strength} set={setStrength} opts={TRAIT_LIST.map((t) => [t.key, `${t.label} (${t.key})`] as [string, string])} />
        <Sel label="Experience" value={level} set={setLevel} opts={levels} />
        <Sel label="Salary up to" value={maxPay} set={setMaxPay} opts={[50000, 75000, 100000, 125000, 150000, 200000].map((n) => [String(n), k(n)] as [string, string])} />
        <Sel label="Hours" value={hours} set={setHours} opts={[["full", "Full-time"], ["part", "Part-time"]]} />
        <Sel label="Location" value={place} set={setPlace} opts={places} />
        <Sel label="Rep" value={rep} set={setRep} opts={reps} />
      </div>

      <div className="bd-bar">
        <div className="bd-only">
          {[
            ["mine", "Only mine"],
            ["gold", "⭐ Gold standard"],
            ["assessed", "Assessment done"],
            ["interest", "Owners unlocked"],
          ].map(([v, l]) => (
            <button key={v} type="button" className={`bd-chip ${only.includes(v) ? "on" : ""}`} onClick={() => toggle(only, setOnly, v)}>
              {l}
            </button>
          ))}
          {anyFilter && (
            <button type="button" className="bd-clear" onClick={clear}>
              Clear filters
            </button>
          )}
        </div>
        <div className="bd-sorts">
          <label className="bd-field">
            <span>Group by</span>
            <select className="select" value={group} onChange={(e) => setGroup(e.target.value)}>
              {GROUPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="bd-field">
            <span>Sort</span>
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>
      </div>

      <p className="small muted" style={{ margin: "4px 0 10px" }}>
        {shown.length} {shown.length === 1 ? "candidate" : "candidates"}
        {group === "strength" || group === "role" || group === "industry" ? ". Someone with two strengths or roles shows in each group." : ""}
      </p>

      {shown.length === 0 ? (
        <p className="panel panel-wash">
          No one matches all of that. Try removing a filter{status.length ? " or picking more statuses above" : ""}, or <Link href="/admin/candidates/new">add a candidate</Link>.
        </p>
      ) : (
        groups.map(([g, list]) => (
          <section key={g || "all"} className="bd-group">
            {g && (
              <h2>
                {g} <span>{list.length}</span>
              </h2>
            )}
            <div className="table-wrap">
              <table className="table bd-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Role and industry</th>
                    <th title="Green: natural strengths. Yellow: can do well. Red: wears them down.">Strengths</th>
                    <th>Salary</th>
                    <th>Experience and hours</th>
                    <th>Location</th>
                    <th>Rep</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link prefetch={false} href={`/admin/candidates/${r.id}`}>
                          <b>{r.name}</b>
                        </Link>
                        {r.gold && <span className="bd-gold">⭐</span>}
                        {r.interest > 0 && <span className="bd-int" title="Owners who unlocked them">{r.interest} unlocked</span>}
                        <div className="small muted">
                          {r.ref}
                          {r.status !== "listed" ? ` · ${STATUS.find(([v]) => v === r.status)?.[1] ?? r.status}` : ""}
                          {r.available ? ` · ${r.available}` : ""}
                          {` · ${r.listed && r.status === "listed" ? "listed" : "added"} ${dateShort(r.listed && r.status === "listed" ? r.listed : r.added)}`}
                        </div>
                        {r.headline && <div className="bd-head">{r.headline}</div>}
                      </td>
                      <td>
                        {r.roles.length ? r.roles.map(nice).join(" / ") : <span className="muted">Not set</span>}
                        <div className="small muted">{r.industries.length ? r.industries.map(nice).join(", ") : "Any industry"}</div>
                      </td>
                      <td>
                        <WGChips result={r.wg} uploaded={r.assessment !== "missing"} tried />
                        {r.wg && (
                          <div className="small muted" style={{ marginTop: 3 }}>
                            {(r.wg.slice(0, 2).split("") as Letter[]).map((l) => TRAITS[l].label).join(", ")}
                          </div>
                        )}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>{pay(r) ?? <span className="muted">Not set</span>}</td>
                      <td>
                        {r.level ?? <span className="muted">Not set</span>}
                        {r.hours && <div className="small muted">{r.hours === "full" ? "Full-time" : r.hours === "part" ? "Part-time" : "Full or part-time"}</div>}
                      </td>
                      <td>
                        {r.place ? nice(r.place) : <span className="muted">Not set</span>}
                        {r.mode && <div className="small muted">{r.mode}</div>}
                      </td>
                      <td>
                        {repOptions ? (
                          <RepPicker candidateId={r.id} value={r.repId} options={repOptions} note={r.repNote} compact />
                        ) : r.mine ? (
                          <b>You</b>
                        ) : (
                          (r.rep ?? <span className="muted">None</span>)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function Sel({ label, value, set, opts }: { label: string; value: string; set: (v: string) => void; opts: (string | [string, string])[] }) {
  return (
    <label className="bd-field">
      <span>{label}</span>
      <select className="select" value={value} onChange={(e) => set(e.target.value)}>
        <option value="">Any</option>
        {opts.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>))}
      </select>
    </label>
  );
}
