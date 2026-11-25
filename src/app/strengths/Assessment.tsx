"use client";

import { useEffect, useState, useTransition } from "react";
import { Answers, closeCall, ITEMS, LENSES, nextExtra, questionById, Result, TOTAL_MAX, TRAITS } from "@/lib/assessment";
import { describe, type Letter } from "@/lib/strengths";
import { submitAssessment, type NextStep } from "./actions";
import s from "./strengths.module.css";

const SAVE = "tcc-strengths-v3";
type Stage = "intro" | "part" | "q" | "more";
type Saved = { stage: Stage; i: number; name: string; email: string; a: Answers };
const empty: Answers = { items: {}, extra: [] };

export function Assessment({ token }: { token: string | null }) {
  const [stage, setStage] = useState<Stage>("intro");
  const [i, setI] = useState(0); // which question, counting the 30 main ones then any backups
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [a, setA] = useState<Answers>(empty);
  const [result, setResult] = useState<Result | null>(null);
  const [near, setNear] = useState<[Letter, Letter] | null>(null);
  const [after, setAfter] = useState<NextStep | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE);
      if (raw) {
        const v = JSON.parse(raw) as Saved;
        // Pick up where they left off (saved in this browser only).
        /* eslint-disable react-hooks/set-state-in-effect */
        setStage(v.stage);
        setI(v.i);
        setName(v.name);
        setEmail(v.email);
        setA({ ...empty, ...v.a });
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    } catch {}
  }, []);
  useEffect(() => {
    if (result) return;
    try {
      localStorage.setItem(SAVE, JSON.stringify({ stage, i, name, email, a }));
    } catch {}
  }, [stage, i, name, email, a, result]);

  const list = ITEMS.concat(a.extra.map((id) => questionById(id)!).filter(Boolean));
  const answered = Object.keys(a.items).length;
  const top = () => window.scrollTo({ top: 0, behavior: "smooth" });

  function finish(final: Answers) {
    setError("");
    start(async () => {
      const r = await submitAssessment(name, email, final, token).catch(() => ({ error: "Something went wrong. Try again." }) as { error: string });
      if ("result" in r && r.result) {
        setResult(r.result);
        setNear(r.result.clear ? null : closeCall(final));
        setAfter(r.next ?? null);
        try {
          localStorage.removeItem(SAVE);
        } catch {}
        window.scrollTo({ top: 0 });
      } else setError(r.error ?? "Something went wrong. Try again.");
    });
  }

  function answer(v: number) {
    const q = list[i];
    const next: Answers = { ...a, items: { ...a.items, [q.id]: v } };
    setA(next);
    setTimeout(() => {
      const n = i + 1;
      top();
      if (n < ITEMS.length) {
        setI(n);
        if (n % 6 === 0) setStage("part");
        return;
      }
      if (n < list.length) return setI(n);
      const id = nextExtra(next);
      if (id) {
        setA({ ...next, extra: [...next.extra, id] });
        setI(n);
        if (!next.extra.length) setStage("more");
        return;
      }
      finish(next);
    }, 220);
  }

  function back() {
    setError("");
    top();
    if (stage === "part") {
      if (i === 0) setStage("intro");
      else {
        setI(i - 1);
        setStage("q");
      }
      return;
    }
    if (i >= ITEMS.length) {
      // Backups depend on the answers before them, so stepping back undoes the last one.
      const last = a.extra.at(-1)!;
      const items = { ...a.items };
      delete items[last];
      setA({ items, extra: a.extra.slice(0, -1) });
      setI(i - 1);
    } else if (i % 6 === 0) setStage("part");
    else setI(i - 1);
  }

  if (result) return <Results name={name} r={result} near={near} next={after} />;

  if (stage === "intro")
    return (
      <div className={s.card}>
        <span className={s.eyebrow}>Before you start</span>
        <h1 className={s.title}>Discover how you&rsquo;re wired.</h1>
        <p className={s.lead}>
          Everyone has natural strengths. In about 8 minutes, see yours: the work that gives you energy, the work that drains
          you, and where you&rsquo;ll do your best.
        </p>
        <div className={s.facts}>
          <span>30 to {TOTAL_MAX} questions</span>
          <span>About 8 minutes</span>
          <span>No right or wrong</span>
        </div>
        <div className={s.tips}>
          {[
            ["Find a calm moment", "Not between meetings or on the run. Get comfortable. This is about you."],
            ["Think about your best days", "Answer for what gives you energy and joy, not what you’re able to do or what your job asks of you."],
            ["Go with your gut", "Your first answer is usually the true one."],
          ].map(([h, p], n) => (
            <div key={h} className={s.tip}>
              <i>{n + 1}</i>
              <div>
                <b>{h}</b>
                <span>{p}</span>
              </div>
            </div>
          ))}
        </div>
        <p className={s.note}>Some questions will feel familiar. That&rsquo;s on purpose. We ask the same thing from a few angles to get you right.</p>
        <label className="field">
          <span>Your name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
        <label className="field">
          <span>Email (optional)</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <button
          className="btn btn-gold"
          style={{ marginTop: 22, width: "100%" }}
          disabled={!name.trim()}
          onClick={() => {
            setStage("part");
            setI(0);
            top();
          }}
        >
          Let&rsquo;s begin
        </button>
      </div>
    );

  const bar = (
    <div className={s.progress} aria-label={`${answered} answered`}>
      <div style={{ width: `${Math.max(3, Math.min(100, (answered / (a.extra.length ? ITEMS.length + a.extra.length + 2 : ITEMS.length + 4)) * 100))}%` }} />
    </div>
  );

  if (stage === "part") {
    const li = Math.floor(i / 6);
    const lens = LENSES[li];
    return (
      <div>
        {bar}
        <p className={s.partLabel}>
          Part {li + 1} of 5 · {answered} answered
        </p>
        <div className={`${s.card} ${s.fade}`}>
          <span className={s.eyebrow}>
            Part {li + 1} · {lens.part}
          </span>
          <h2>{lens.prompt.replace("…", "")}</h2>
          <p className={s.muted}>{lens.intro}</p>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => setStage("q")}>
            Start part {li + 1}
          </button>
        </div>
        <div className={s.nav}>
          <button className="btn btn-ghost" onClick={back}>
            Back
          </button>
        </div>
      </div>
    );
  }

  if (stage === "more")
    return (
      <div>
        {bar}
        <p className={s.partLabel}>Almost there · {answered} answered</p>
        <div className={`${s.card} ${s.fade}`}>
          <span className={s.eyebrow}>Getting it right</span>
          <h2>A few of your strengths are close.</h2>
          <p className={s.muted}>We&rsquo;ll ask a handful more, from different angles, so your result is really you. This only happens when it&rsquo;s needed.</p>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => setStage("q")}>
            Keep going
          </button>
        </div>
      </div>
    );

  const q = list[i];
  const lens = LENSES[q.lens];
  const cur = a.items[q.id];
  return (
    <div>
      {bar}
      <p className={s.partLabel}>
        {i >= ITEMS.length ? "Getting it right" : `Part ${q.lens + 1} of 5 · ${lens.part}`} · {answered} answered
      </p>
      <div key={q.id} className={s.fade}>
        <p className={s.prompt}>{lens.prompt}</p>
        <h2 className={s.item}>{q.text}</h2>
        <div className={s.scale} role="radiogroup" aria-label={q.text}>
          {lens.scale
            .map((label, n) => ({ label, v: n + 1 }))
            .reverse()
            .map((o) => (
              <button
                key={o.v}
                type="button"
                role="radio"
                aria-checked={cur === o.v}
                className={cur === o.v ? s.on : ""}
                disabled={pending}
                onClick={() => answer(o.v)}
              >
                <span className={s.dot} />
                {o.label}
              </button>
            ))}
        </div>
      </div>
      <div className={s.nav}>
        <button className="btn btn-ghost" onClick={back} disabled={pending}>
          Back
        </button>
        <span className={s.hint}>{pending ? "Working it out…" : "Tap an answer to continue"}</span>
      </div>
      {error && (
        <p className="notice notice-bad">
          {error}{" "}
          <button className="btn btn-ghost btn-small" onClick={() => finish(a)}>
            Try again
          </button>
        </p>
      )}
    </div>
  );
}

function Results({ name, r, near, next }: { name: string; r: Result; near: [Letter, Letter] | null; next: NextStep | null }) {
  const first = name.trim().split(/\s+/)[0];
  const top = r.order.slice(0, 2);
  const d = describe(r.letters);
  const tiers: [string, string, Letter[], string][] = [
    ["Your natural strengths", "This is the work that gives you energy. Look for a job built around it.", top, s.t1],
    // Heshy's rule (TIERS in lib/strengths): the 3rd is close to the top; the 4th is okay but closer to the bottom.
    ["Close behind", "Nearly as strong as your top two. A real strength you can lean on.", r.order.slice(2, 3), s.t2],
    ["Doable, in doses", "You can do this fine. It just leans toward the work that tires you.", r.order.slice(3, 4), s.t2b],
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
          <b>{d.title}.</b> {d.line}
        </p>
      )}
      {near && (
        <p className={s.close}>
          <b>A close call.</b> {TRAITS[near[0]].label} and {TRAITS[near[1]].label} came out almost even for you. Both are real.
          Your call with our team is a good place to talk it through.
        </p>
      )}
      {next && <WhatsNext next={next} />}
      {[tiers.slice(0, 1), tiers.slice(1, 3), tiers.slice(3)].map((row, i) => (
        <div key={i} className={i === 1 ? s.midRow : undefined}>
      {row.map(([h, p, ks, cls]) => (
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
        </div>
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

// Right under their result: what happens now, so nobody is left wondering.
function WhatsNext({ next }: { next: NextStep }) {
  if (next.kind === "listed")
    return (
      <section className={s.next}>
        <p className={s.nextLabel}>All set</p>
        <p>We&rsquo;ve added this to your profile. Nothing for you to do.</p>
      </section>
    );
  if (next.kind === "after_call")
    return (
      <section className={s.next}>
        <p className={s.nextLabel}>What&rsquo;s next</p>
        <h3>{next.rep} has your results</h3>
        <p>They&rsquo;re using them for your profile. We&rsquo;ll be in touch soon. Nothing for you to do right now.</p>
      </section>
    );
  if (next.kind === "call")
    return (
      <section className={s.next}>
        <p className={s.nextLabel}>What&rsquo;s next</p>
        <h3>Your call with {next.rep}</h3>
        <p className={s.nextWhen}>{next.when}</p>
        <p>{next.rep} already has your results and will go through them with you. Nothing else to do before then.</p>
        <div className={s.nextRow}>
          {next.join && (
            <a className="btn btn-gold" href={next.join}>
              Join link for the call
            </a>
          )}
          <a className="small" href={next.manage}>
            Need a different time?
          </a>
        </div>
      </section>
    );
  if (next.kind === "book")
    return (
      <section className={s.next}>
        <p className={s.nextLabel}>What&rsquo;s next</p>
        <h3>Pick a time for your call</h3>
        <p>A free call with one of our team. Together you&rsquo;ll go through these results and figure out what kind of work fits you best.</p>
        <a className="btn btn-gold" href={next.url}>
          Pick a time →
        </a>
      </section>
    );
  return (
    <section className={s.next}>
      <p className={s.nextLabel}>What&rsquo;s next</p>
      <h3>Want help finding work that fits?</h3>
      <p>Sign up (it takes two minutes) and book a free call with our team. Use the same email so we can match your results.</p>
      <a className="btn btn-gold" href={next.url}>
        Get started →
      </a>
    </section>
  );
}
