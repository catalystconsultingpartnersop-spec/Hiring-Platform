"use client";

import { useActionState, useState, useTransition } from "react";
import type { PositionDraft } from "@/lib/positions";
import { ROLE_LIST } from "@/lib/writingHelp";
import { fillFromPost, savePosition } from "./actions";

const LEVELS = [
  ["", "Not said"],
  ["beginner", "Beginner"],
  ["experienced", "Experienced"],
  ["senior", "Senior"],
];
const MODES = [
  ["", "Not said"],
  ["on-site", "On-site"],
  ["hybrid", "Hybrid"],
  ["remote", "Remote"],
  ["flexible", "Flexible"],
];

// Add or edit a private open position. Paste a job post and let the AI fill it in.
export function PositionForm({ id, start }: { id: string | null; start: PositionDraft }) {
  const [v, setV] = useState<PositionDraft>(start);
  const [post, setPost] = useState("");
  const [note, setNote] = useState("");
  const [reading, read] = useTransition();
  const [state, action, pending] = useActionState(savePosition.bind(null, id), {});
  const set = (k: keyof PositionDraft) => (e: { target: { value: string } }) => setV((cur) => ({ ...cur, [k]: e.target.value }));
  const field = (k: keyof PositionDraft, label: string, opts: { wide?: boolean; placeholder?: string } = {}) => (
    <label className="field" style={opts.wide ? { gridColumn: "1 / -1" } : undefined}>
      <span>{label}</span>
      <input className="input" name={k} value={v[k] ?? ""} onChange={set(k)} placeholder={opts.placeholder} />
    </label>
  );

  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 760 }}>
      {!id && (
        <section className="panel">
          <h2 style={{ fontSize: 18, margin: "0 0 6px" }}>Paste the job post</h2>
          <textarea
            className="textarea"
            rows={6}
            value={post}
            onChange={(e) => setPost(e.target.value)}
            placeholder="Paste the whole post here: from a website, an email, or a WhatsApp message."
          />
          <button
            type="button"
            className="btn btn-gold btn-small"
            style={{ marginTop: 10 }}
            disabled={reading || !post.trim()}
            onClick={() =>
              read(async () => {
                setNote("");
                const r = await fillFromPost(post);
                if (r.draft) {
                  setV((cur) => ({ ...cur, ...Object.fromEntries(Object.entries(r.draft!).filter(([, x]) => x)), description: r.draft!.description || post.slice(0, 1500) }));
                  setNote("Filled in below. Check it, then save.");
                } else setNote(r.error ?? "Something went wrong.");
              })
            }
          >
            {reading ? "Reading… (about 10 seconds)" : "Fill it in for me"}
          </button>
          {note && <p className="small" style={{ marginTop: 8 }}>{note}</p>}
        </section>
      )}
      <form action={action} className="panel" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "4px 16px" }}>
        {field("title", "Position *", { placeholder: "e.g. Office manager" })}
        {field("company", "Company")}
        {field("location", "Location", { placeholder: "e.g. Brooklyn NY" })}
        <label className="field">
          <span>Work setting</span>
          <select className="select" name="work_mode" value={v.work_mode ?? ""} onChange={set("work_mode")}>
            {MODES.map(([val, l]) => (
              <option key={val} value={val}>
                {l}
              </option>
            ))}
          </select>
        </label>
        {field("salary_min", "Pay from (yearly)", { placeholder: "e.g. 70000" })}
        {field("salary_max", "Pay up to (yearly)", { placeholder: "e.g. 80000" })}
        <label className="field">
          <span>Level</span>
          <select className="select" name="level" value={v.level ?? ""} onChange={set("level")}>
            {LEVELS.map(([val, l]) => (
              <option key={val} value={val}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Closest role</span>
          <input className="input" name="role_category" list="pos-roles" value={v.role_category ?? ""} onChange={set("role_category")} />
          <datalist id="pos-roles">
            {ROLE_LIST.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </label>
        {field("industry", "Industry")}
        {field("starts", "Start", { placeholder: "e.g. As soon as possible" })}
        {field("needs", "What the job needs most in a person", { wide: true, placeholder: "e.g. Follow-through, organized, calm with vendors" })}
        <label className="field" style={{ gridColumn: "1 / -1" }}>
          <span>About the job</span>
          <textarea className="textarea" name="description" rows={4} value={v.description ?? ""} onChange={set("description")} />
        </label>
        {field("contact_name", "Contact person")}
        {field("contact_email", "Contact email")}
        {field("url", "Link to the post", { wide: true })}
        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, alignItems: "center", marginTop: 6 }}>
          <button className="btn btn-gold" type="submit" disabled={pending}>
            {pending ? "Saving…" : id ? "Save" : "Add position"}
          </button>
          {state.error && <span className="notice notice-bad">{state.error}</span>}
        </div>
      </form>
    </div>
  );
}
