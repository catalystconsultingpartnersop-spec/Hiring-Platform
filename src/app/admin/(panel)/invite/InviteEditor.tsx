"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Invite, Item, Profile } from "@/lib/repInvite";
import { resetInviteWording, saveInviteWording } from "./actions";
import styles from "./invite.module.css";

async function buildPdf(name: string, invite: Invite) {
  const res = await fetch("/api/admin/invite-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, invite }),
  });
  if (!res.ok) throw new Error("The PDF didn't build. Try again.");
  return res.blob();
}

export function InviteEditor({ initial }: { initial: Invite }) {
  const [name, setName] = useState("Pinny");
  const [inv, setInv] = useState<Invite>(initial);
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("Building preview…");
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [saving, startSave] = useTransition();
  const [downloading, setDownloading] = useState(false);
  const seq = useRef(0);

  // Rebuild the preview shortly after typing stops.
  useEffect(() => {
    const n = ++seq.current;
    setStatus("Updating preview…");
    const t = setTimeout(async () => {
      try {
        const blob = await buildPdf(name, inv);
        if (n !== seq.current) return;
        const next = URL.createObjectURL(blob);
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return next;
        });
        setStatus("Preview is up to date.");
      } catch (e) {
        if (n === seq.current) setStatus((e as Error).message);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [name, inv]);

  const set = <K extends keyof Invite>(k: K, v: Invite[K]) => {
    setInv((x) => ({ ...x, [k]: v }));
    setMsg({});
  };
  const first = name.trim().split(/\s+/)[0] || "rep";

  async function download() {
    setDownloading(true);
    try {
      const blob = await buildPdf(name, inv);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `Invitation for ${first}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (e) {
      setMsg({ error: (e as Error).message });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className={styles.layout}>
      <div>
        <div className={styles.top}>
          <label className="field">
            <span>Who are you inviting?</span>
            <input
              id="rep-name"
              className={`input ${styles.nameInput}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First name"
            />
          </label>
          <button className="btn btn-gold" type="button" onClick={download} disabled={downloading}>
            {downloading ? "Building…" : `Download ${first}'s PDF`}
          </button>
        </div>
        <p className={styles.hint} style={{ marginBottom: 14 }}>
          Write <b>{"{name}"}</b> anywhere below and it becomes the rep&rsquo;s first name. The mission and website links are
          added at the end automatically.
        </p>

        <div className={styles.form}>
          <Group title="Opening" open>
            <Field label="Small line at the top" value={inv.from} onChange={(v) => set("from", v)} />
            <Field label="Headline" value={inv.headline} onChange={(v) => set("headline", v)} />
            <Field label="Intro" value={inv.lede} onChange={(v) => set("lede", v)} long />
          </Group>

          <Group title="The big idea">
            <Field label="First part (green)" value={inv.thesisA} onChange={(v) => set("thesisA", v)} />
            <Field label="Second part (gold)" value={inv.thesisB} onChange={(v) => set("thesisB", v)} long />
            <Field label="Line under the graphic" value={inv.caption} onChange={(v) => set("caption", v)} long />
          </Group>

          <Group title="Graphic: the candidate side">
            <Items items={inv.candidateSteps} onChange={(v) => set("candidateSteps", v)} tLabel="Step" dLabel="Detail" max={6} />
          </Group>

          <Group title="Graphic: example profiles in the middle">
            <Profiles items={inv.profiles} onChange={(v) => set("profiles", v)} />
          </Group>

          <Group title="Graphic: the owner side">
            <Items items={inv.ownerSteps} onChange={(v) => set("ownerSteps", v)} tLabel="Step" dLabel="Detail" max={6} />
          </Group>

          <Group title="Why candidates love it">
            <Items items={inv.candidatesLove} onChange={(v) => set("candidatesLove", v)} tLabel="Point" dLabel="Explanation" max={8} />
          </Group>

          <Group title="Why owners love it">
            <Items items={inv.ownersLove} onChange={(v) => set("ownersLove", v)} tLabel="Point" dLabel="Explanation" max={8} />
          </Group>

          <Group title="Where you come in">
            <Field label="Heading" value={inv.youTitle} onChange={(v) => set("youTitle", v)} />
            <p className={styles.hint}>Each paragraph can start with a bold lead-in. Leave it empty for a plain paragraph.</p>
            <Items items={inv.you} onChange={(v) => set("you", v)} tLabel="Bold lead-in" dLabel="Paragraph" max={10} />
          </Group>

          <Group title="Who I'm looking for">
            <label className="field">
              <span>One quality per line</span>
              <textarea
                id="qualities"
                className="textarea"
                rows={6}
                value={inv.qualities.join("\n")}
                onChange={(e) => set("qualities", e.target.value.split("\n"))}
              />
            </label>
            <Field label="Line under the list" value={inv.qualitiesFooter} onChange={(v) => set("qualitiesFooter", v)} />
          </Group>

          <Group title="Closing">
            <Field label="Heading" value={inv.closeTitle} onChange={(v) => set("closeTitle", v)} />
            <Field label="Message" value={inv.closeText} onChange={(v) => set("closeText", v)} long />
            <Field label="Signed" value={inv.signature} onChange={(v) => set("signature", v)} />
          </Group>
        </div>

        <div className={styles.actions} style={{ marginTop: 16 }}>
          <button
            className="btn btn-small"
            type="button"
            disabled={saving}
            onClick={() => startSave(async () => setMsg(await saveInviteWording(JSON.stringify(inv))))}
          >
            {saving ? "Saving…" : "Save this wording for next time"}
          </button>
          <button
            className="btn btn-ghost btn-small"
            type="button"
            disabled={saving}
            onClick={() =>
              startSave(async () => {
                setInv(await resetInviteWording());
                setMsg({ ok: "Back to the original wording." });
              })
            }
          >
            Reset to original
          </button>
        </div>
        {msg.ok && <p className="notice notice-good" style={{ marginTop: 10 }}>{msg.ok}</p>}
        {msg.error && <p className="notice notice-bad" style={{ marginTop: 10 }}>{msg.error}</p>}
      </div>

      <div className={styles.preview}>
        <p className={styles.status} aria-live="polite">{status}</p>
        {url ? (
          <iframe className={styles.frame} src={`${url}#view=FitH`} title={`Invitation for ${first}`} />
        ) : (
          <div className={styles.frame} />
        )}
      </div>
    </div>
  );
}

function Group({ title, open, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details className={styles.group} open={open}>
      <summary>{title}</summary>
      <div className={styles.body}>{children}</div>
    </details>
  );
}

function Field({ label, value, onChange, long }: { label: string; value: string; onChange: (v: string) => void; long?: boolean }) {
  return (
    <label className="field">
      <span>{label}</span>
      {long ? (
        <textarea className="textarea" rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function Items(p: { items: Item[]; onChange: (v: Item[]) => void; tLabel: string; dLabel: string; max: number }) {
  const upd = (i: number, k: keyof Item, v: string) => p.onChange(p.items.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <>
      {p.items.map((it, i) => (
        <div key={i} className={styles.row}>
          <button type="button" className={styles.remove} onClick={() => p.onChange(p.items.filter((_, j) => j !== i))}>
            Remove
          </button>
          <input className="input" aria-label={p.tLabel} placeholder={p.tLabel} value={it.t} onChange={(e) => upd(i, "t", e.target.value)} style={{ fontWeight: 600, maxWidth: "calc(100% - 64px)" }} />
          <textarea className="textarea" aria-label={p.dLabel} placeholder={p.dLabel} rows={2} value={it.d} onChange={(e) => upd(i, "d", e.target.value)} />
        </div>
      ))}
      {p.items.length < p.max && (
        <button type="button" className="btn btn-ghost btn-small" onClick={() => p.onChange([...p.items, { t: "", d: "" }])}>
          Add one
        </button>
      )}
    </>
  );
}

function Profiles({ items, onChange }: { items: Profile[]; onChange: (v: Profile[]) => void }) {
  const upd = (i: number, k: keyof Profile, v: string) => onChange(items.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <>
      {items.map((p, i) => (
        <div key={i} className={styles.row}>
          <button type="button" className={styles.remove} onClick={() => onChange(items.filter((_, j) => j !== i))}>
            Remove
          </button>
          <div className={styles.row2} style={{ maxWidth: "calc(100% - 64px)" }}>
            <input className="input" aria-label="Role" placeholder="Role" value={p.role} onChange={(e) => upd(i, "role", e.target.value)} />
            <input className="input" aria-label="Experience" placeholder="Experience, e.g. 6 yrs" value={p.years} onChange={(e) => upd(i, "years", e.target.value)} />
          </div>
          <input className="input" aria-label="Headline" placeholder="Headline" value={p.headline} onChange={(e) => upd(i, "headline", e.target.value)} style={{ fontWeight: 600 }} />
          <input className="input" aria-label="Strengths" placeholder="Strengths, separated by commas" value={p.strengths} onChange={(e) => upd(i, "strengths", e.target.value)} />
        </div>
      ))}
      {items.length < 6 && (
        <button type="button" className="btn btn-ghost btn-small" onClick={() => onChange([...items, { role: "", headline: "", strengths: "", years: "" }])}>
          Add a profile
        </button>
      )}
    </>
  );
}
