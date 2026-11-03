"use client";

import { useEffect, useState, useTransition } from "react";
import { Answers, ITEMS, MAX_EXTRA, nextExtra, PAIRS, Result, SCALE, SNIPPETS, TRAITS } from "@/lib/assessment";
import { describe, type Letter } from "@/lib/strengths";
import { submitAssessment } from "./actions";
import s from "./strengths.module.css";

const SAVE = "tcc-strengths-v2";
const PAGES = [
  { part: 1, items: ITEMS.slice(0, 8) },
  { part: 1, items: ITEMS.slice(8, 16) },
  { part: 1, items: ITEMS.slice(16, 24) },
  { part: 2 },
  { part: 3 },
] as const;
const TOTAL = ITEMS.length + PAIRS.length + MAX_EXTRA;

type Saved = { step: number; name: string; email: string; a: Answers };
const empty: Answers = { items: {}, pairs: {}, extra: [] };

export function Assessment({ token }: { token: string | null }) {
  const [step, setStep] = useState(-1); // -1 intro, 0..4 pages
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
  const next = page?.part === 3 ? nextExtra(a) : null;
  const pageDone =
    !page ||
    ("items" in page && page.items.every((q) => a.items[q.id])) ||
    (page.part === 2 && PAIRS.every((p) => a.pairs[p.id])) ||
    (page.part === 3 && !next);
  const answered = Object.keys(a.items).length + Object.keys(a.pairs).length + a.extra.length;

  function finish() {
    start(async () => {
      const r = await submitAssessment(name, email, a, token).catch(() => ({ error: "Something went wrong. Try again." }) as { error: string });
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
          About 8 minutes. There are no right or wrong answers. Go with your gut, and answer for what gives you energy and
          joy, not just what you&rsquo;re able to do.
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

  // Back from the follow-ups undoes the last one, since each depends on the ones before.
  const back = () => {
    if (page?.part === 3 && a.extra.length) setA((x) => ({ ...x, extra: x.extra.slice(0, -1) }));
    else go(step - 1);
  };

  return (
    <div>
      <div className={s.progress} aria-label={`${answered} of ${TOTAL} answered`}>
        <div style={{ width: `${Math.max(3, (answered / TOTAL) * 100)}%` }} />
      </div>
      <p className={s.partLabel}>
        Part {page!.part} of 3 · {answered} of {TOTAL} answered
      </p>
      <p className={s.change}>
        {page!.part === 3 ? "Changed your mind? Tap Back." : "Changed your mind? Tap a different answer. Use Back to fix an earlier page."}
      </p>

      {page && "items" in page && (
        <>
          <h2 className={s.ask}>How much energy does this give you?</h2>
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

      {page?.part === 2 && (
        <>
          <h2 className={s.ask}>Which would you rather spend your day doing?</h2>
          <p className={s.muted}>Even if you like both, pick one.</p>
          {PAIRS.map((p) => (
            <div key={p.id} className={s.pair} role="radiogroup">
              {([
                [p.a, p.at],
                [p.b, p.bt],
              ] as [Letter, string][]).map(([k, t]) => (
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

      {page?.part === 3 &&
        (next ? (
          <>
            <h2 className={s.ask}>A few last ones to sharpen your result</h2>
            <p className={s.muted}>
              Which gives you more energy? Question {a.extra.length + 1} of {MAX_EXTRA}.
            </p>
            <div className={s.pair} role="radiogroup">
              {([
                [next.a, SNIPPETS[next.a][next.ai]],
                [next.b, SNIPPETS[next.b][next.bi]],
              ] as [Letter, string][]).map(([k, t]) => (
                <button key={k} type="button" role="radio" aria-checked={false} onClick={() => setA((x) => ({ ...x, extra: [...x.extra, { ...next, pick: k }] }))}>
                  {t}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className={s.card}>
            <h2>That&rsquo;s everything</h2>
            <p className={s.muted} style={{ margin: 0 }}>
              Tap below to see how you&rsquo;re wired. Once you do, your answers are final.
            </p>
          </div>
        ))}

      <div className={s.nav}>
        <button className="btn btn-ghost" onClick={back} disabled={pending}>
          Back
        </button>
        {step < PAGES.length - 1 ? (
          <button className="btn btn-gold" disabled={!pageDone} onClick={() => go(step + 1)}>
            Next
          </button>
        ) : (
          !next && (
            <button className="btn btn-gold" disabled={pending} onClick={finish}>
              {pending ? "Working it out…" : "See my results"}
            </button>
          )
        )}
      </div>
      {!pageDone && page?.part !== 3 && <p className={s.hint}>Answer each one to continue.</p>}
      {error && <p className="notice notice-bad">{error}</p>}
    </div>
  );
}

function Results({ name, r }: { name: string; r: Result }) {
  const first = name.trim().split(/\s+/)[0];
  const top = r.order.slice(0, 2);
  const d = describe(r.letters);
  const tiers: [string, string, Letter[], string][] = [
    ["Your natural strengths", "This is the work that gives you energy. Look for a job built around it.", top, s.t1],
    ["You can do these well", "You're good at these, in doses. They don't drain you, and they don't fuel you either.", r.order.slice(2, 4), s.t2],
    ["These wear you down", "You can do some of it. Just don't build your whole day around it.", r.order.slice(4, 6), s.t3],
  ];
  return (
    <div className={s.results}>
      <p className={s.partLabel}>{first}, here&rsquo;s how you&rsquo;re wired</p>
      <h2 className={s.big}>
        {TRAITS[top[0]].label} <span>+</span> {TRAITS[top[1]].label}
      </h2>
      {d && (
        <p className={s.typeLine}>
          <b>{d.name}.</b> {d.line}
        </p>
      )}
      {tiers.map(([h, p, ks, cls]) => (
        <section key={h} className={`${s.tier} ${cls}`}>
          <h3>{h}</h3>
          <div className={s.tierGrid}>
            {ks.map((k) => (
              <div key={k}>
                <b>{TRAITS[k].label}</b>
                <span>{TRAITS[k].short}</span>
              </div>
            ))}
          </div>
          <p>{p}</p>
        </section>
      ))}
      {d && (
        <section className={s.block}>
          <h3>Where you could shine</h3>
          <p>{d.thrives}</p>
        </section>
      )}
      <p className={s.pilot}>
        This is a new assessment we&rsquo;re testing. If something here doesn&rsquo;t sound like you, that&rsquo;s exactly what
        we want to hear.
      </p>
    </div>
  );
}
