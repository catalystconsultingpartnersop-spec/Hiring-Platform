"use client";

import { useLayoutEffect, useRef, useState } from "react";
import s from "./room.module.css";

// A textarea where typing @ shows the team (and "all") to pick from.
export function MentionText({ value, onChange, names, ...rest }: { value: string; onChange: (v: string) => void; names: string[]; name: string; rows: number; placeholder: string; autoFocus?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [q, setQ] = useState<string | null>(null);
  const [hi, setHi] = useState(0);
  const caretTo = useRef<number | null>(null);
  // After picking a name, put the cursor right after it before the next keystroke.
  useLayoutEffect(() => {
    if (caretTo.current != null && ref.current) {
      ref.current.focus();
      ref.current.setSelectionRange(caretTo.current, caretTo.current);
      caretTo.current = null;
    }
  }, [value]);
  const options = q == null ? [] : [{ n: "all", label: "@all · everyone on the team" }, ...names.map((n) => ({ n, label: `@${n}` }))].filter((o) => o.n.toLowerCase().startsWith(q.toLowerCase()));

  const check = (v: string, caret: number) => {
    const m = v.slice(0, caret).match(/(?:^|\s)@([A-Za-z]*)$/);
    setQ(m ? m[1] : null);
    setHi(0);
  };
  const pick = (n: string) => {
    const el = ref.current;
    const caret = el?.selectionStart ?? value.length;
    const before = value.slice(0, caret).replace(/@([A-Za-z]*)$/, `@${n} `);
    const next = before + value.slice(caret);
    caretTo.current = before.length;
    onChange(next);
    setQ(null);
  };

  return (
    <div className={s.mentionWrap}>
      <textarea
        ref={ref}
        className="textarea"
        {...rest}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          check(e.target.value, e.target.selectionStart);
        }}
        onKeyDown={(e) => {
          if (!options.length) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setHi((h) => (h + (e.key === "ArrowDown" ? 1 : options.length - 1)) % options.length);
          } else if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            pick(options[hi].n);
          } else if (e.key === "Escape") setQ(null);
        }}
        onBlur={() => setTimeout(() => setQ(null), 150)}
      />
      {options.length > 0 && (
        <ul className={s.mentionList} role="listbox">
          {options.map((o, i) => (
            <li key={o.n} role="option" aria-selected={i === hi}>
              <button type="button" className={i === hi ? s.mentionOn : ""} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(o.n)}>
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
