"use client";

import { useEffect, useState, useTransition } from "react";
import { Answers, ITEMS, Key, PAIRS, Result, SCALE, STRENGTHS, STYLES } from "@/lib/assessment";
import { submitAssessment } from "./actions";
import s from "./strengths.module.css";

const SAVE = "tcc-strengths-v1";
const PAGES = [
  { part: 1, items: ITEMS.slice(0, 9) },
  { part: 1, items: ITEMS.slice(9, 18) },
  { part: 1, items: ITEMS.slice(18, 27) },
  { part: 2, pairs: PAIRS.slice(0, 7) },
  { part: 2, pairs: PAIRS.slice(7) },
  { part: 3 },
] as const;

type Saved = { step: number; name: string; email: string; a: Answers };
const empty: Answers = { items: {}, pairs: {}, styles: {} };

export function Assessment() {
  const [step, setStep] = useState(-1); // -1 intro, 0..5 pages
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [a, setA] = useState<Answers>(empty);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE);
      if (raw) {
        const v = JSON.parse(raw) as Saved;
        // Pick up where they left off (saved in this browser only).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStep(v.step);
        setName(v.name);
        setEmail(v.email);
        setA({ ...empty, ...v.a });
      }
    } catch {}
  }, []);
  useEffect(() => {
    if (result) return;
    try {
      localStorage.setItem(SAVE, JSON.stringify({ step, name, email, a }));
    } catch {}
  }, [step, name, email, a, result]);

  const go = (n: number) => {
    setError("");
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const page = step >= 0 ? PAGES[step] : null;
  const pageDone =
    !page ||
    ("items" in page && page.items.every((q) => a.items[q.id])) ||
    ("pairs" in page && page.pairs.every((p) => a.pairs[p.id])) ||
    (page.part === 3 && STYLES.every((x) => a.styles[x.id]));

  function finish() {
    start(async () => {
      const r = await submitAssessment(name, email, a).catch(() => ({ error: "Something went wrong. Try again." }) as { error: string });
      if ("result" in r && r.result) {
        setResult(r.result);
        try {
          localStorage.removeItem(SAVE);
        } catch {}
        window.scrollTo({ top: 0 });
      } else setError(r.error ?? "Something went wrong. Try again.");
    });
  }

  if (result) return <Results name={name} r={result} />;

  if (step < 0)
    return (
      <div className={s.card}>
        <h2>Before you start</h2>
        <p className={s.muted}>
          About 7 minutes. There are no right or wrong answers. Go with your gut, and answer for what gives you energy,
          not what you&rsquo;re able to do.
        </p>
        <label className="field">
          <span>Your name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
        <label className="field">
          <span>Email (optional)</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <button className="btn btn-gold" style={{ marginTop: 22 }} disabled={!name.trim()} onClick={() => go(0)}>
          Start
        </button>
      </div>
    );

  const total = PAGES.length;
  return (
    <div>
      <div className={s.progress} aria-label={`Page ${step + 1} of ${total}`}>
        <div style={{ width: `${((step + (pageDone ? 1 : 0.5)) / total) * 100}%` }} />
      </div>
      <p className={s.partLabel}>
        Part {page!.part} of 3 · Page {step + 1} of {total}
      </p>

      {page && "items" in page && (
        <>
          <h2 className={s.ask}>How do you feel about this kind of work?</h2>
          {page.items.map((q) => (
            <div key={q.id} className={s.q}>
              <p>{q.text}</p>
              <div className={s.scale} role="radiogroup" aria-label={q.text}>
                {SCALE.map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    role="radio"
                    aria-checked={a.items[q.id] === o.v}
                    className={a.items[q.id] === o.v ? s.on : ""}
                    onClick={() => setA((x) => ({ ...x, items: { ...x.items, [q.id]: o.v } }))}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {page && "pairs" in page && (
        <>
          <h2 className={s.ask}>Which would you rather spend your day doing?</h2>
          <p className={s.muted}>Even if you like both, pick one.</p>
          {page.pairs.map((p) => (
            <div key={p.id} className={s.pair} role="radiogroup">
              {([
                [p.a, p.at],
                [p.b, p.bt],
              ] as [Key, string][]).map(([k, t]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={a.pairs[p.id] === k}
                  className={a.pairs[p.id] === k ? s.on : ""}
                  onClick={() => setA((x) => ({ ...x, pairs: { ...x.pairs, [p.id]: k } }))}
                >
                  {t}
                </button>
              ))}
            </div>
          ))}
        </>
      )}

      {page && page.part === 3 && (
        <>
          <h2 className={s.ask}>What kind of workday suits you?</h2>
          <p className={s.muted}>Pick the spot that fits you best between the two.</p>
          {STYLES.map((x) => (
            <div key={x.id} className={s.q}>
              <div className={s.ends}>
                <span>{x.left}</span>
                <span>{x.right}</span>
              </div>
              <div className={s.dots} role="radiogroup" aria-label={`${x.left} or ${x.right}`}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={a.styles[x.id] === v}
                    aria-label={v === 1 ? x.left : v === 5 ? x.right : v === 3 ? "In between" : v < 3 ? `Leaning: ${x.left}` : `Leaning: ${x.right}`}
                    className={a.styles[x.id] === v ? s.on : ""}
                    onClick={() => setA((y) => ({ ...y, styles: { ...y.styles, [x.id]: v } }))}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      <div className={s.nav}>
        <button className="btn btn-ghost" onClick={() => go(step - 1)} disabled={pending}>
          Back
        </button>
        {step < total - 1 ? (
          <button className="btn btn-gold" disabled={!pageDone} onClick={() => go(step + 1)}>
            Next
          </button>
        ) : (
          <button className="btn btn-gold" disabled={!pageDone || pending} onClick={finish}>
            {pending ? "Working it out…" : "See my results"}
          </button>
        )}
      </div>
      {!pageDone && <p className={s.hint}>Answer each one to continue.</p>}
      {error && <p className="notice notice-bad">{error}</p>}
    </div>
  );
}

function Results({ name, r }: { name: string; r: Result }) {
  const first = name.trim().split(/\s+/)[0];
  const [a, b] = r.top.map((k) => STRENGTHS[k]);
  return (
    <div className={s.results}>
      <p className={s.partLabel}>{first}, here&rsquo;s how you&rsquo;re wired</p>
      <h2 className={s.big}>
        {a.name} <span>+</span> {b.name}
      </h2>
      <div className={s.topGrid}>
        {[a, b].map((t) => (
          <div key={t.name} className={s.topCard}>
            <h3>{t.name}</h3>
            <p className={s.tag}>{t.short}</p>
            <p>{t.about}</p>
          </div>
        ))}
      </div>

      <section className={s.block}>
        <h3>Where you could shine</h3>
        <ul className={s.chips}>
          {r.roles.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>

      <section className={s.block}>
        <h3>Also strong</h3>
        <p>
          {r.next.map((k) => STRENGTHS[k].name).join(" and ")}. You can lean on these and enjoy them, even if they&rsquo;re
          not the center of who you are.
        </p>
      </section>

      <section className={s.block}>
        <h3>What wears you down</h3>
        <p>
          A job full of {STRENGTHS[r.low[0]].drain}, or {STRENGTHS[r.low[1]].drain}. You can do some of it. Just don&rsquo;t
          build your whole day around it.
        </p>
      </section>

      <section className={s.block}>
        <h3>How you like to work</h3>
        <ul className={s.plain}>
          {r.style.map((x) => (
            <li key={x.dim}>{x.text[0].toUpperCase() + x.text.slice(1)}</li>
          ))}
        </ul>
      </section>

      <section className={s.block}>
        <h3>All nine, side by side</h3>
        <div className={s.bars}>
          {r.ranked.map((x) => (
            <div key={x.key} className={s.bar}>
              <span>{STRENGTHS[x.key].name}</span>
              <div>
                <i style={{ width: `${Math.max(4, x.score)}%` }} className={r.top.includes(x.key) ? s.hi : r.low.includes(x.key) ? s.lo : ""} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className={s.pilot}>
        This is a new assessment we&rsquo;re testing. If something here doesn&rsquo;t sound like you, that&rsquo;s exactly what
        we want to hear.
      </p>
    </div>
  );
}
