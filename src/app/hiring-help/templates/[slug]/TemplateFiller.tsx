"use client";

import { useMemo, useState } from "react";
import { DOC_CSS, markupToHtml } from "@/lib/markup";
import type { Field } from "@/lib/templates";
import styles from "../../help.module.css";

export function TemplateFiller({
  title,
  body,
  fields,
  initial,
}: {
  title: string;
  body: string;
  fields: Field[];
  initial: Record<string, string>;
}) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [printing, setPrinting] = useState(false);
  const [copied, setCopied] = useState(false);
  const labels = useMemo(() => Object.fromEntries(fields.map((f) => [f.key, f.label])), [fields]);

  // Dates are typed as yyyy-mm-dd; show them as "November 3, 2026".
  const shown = useMemo(() => {
    const out: Record<string, string> = {};
    for (const f of fields) {
      const v = values[f.key] ?? "";
      out[f.key] =
        f.type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(v)
          ? new Date(v + "T12:00:00").toLocaleDateString("en-US", { dateStyle: "long" })
          : v;
    }
    return out;
  }, [values, fields]);

  const html = markupToHtml(body, { values: shown, labels, blanks: printing ? "line" : "highlight" });

  function print() {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 50);
  }

  function downloadWord() {
    const doc = markupToHtml(body, { values: shown, blanks: "line" });
    const file = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${title}</title><style>${DOC_CSS}</style></head><body>${doc}</body></html>`;
    const blob = new Blob(["﻿", file], { type: "application/msword" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/[^\w ]+/g, "").trim()}.doc`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function copyText() {
    const div = document.createElement("div");
    div.innerHTML = markupToHtml(body, { values: shown, blanks: "line" });
    try {
      await navigator.clipboard.writeText(div.innerText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={styles.filler}>
      <div className={`${styles.fields} no-print`}>
        <strong>Fill in the blanks</strong>
        {fields.map((f) => (
          <label key={f.key} className="field">
            <span>{f.label}</span>
            {f.type === "textarea" ? (
              <textarea
                className="textarea"
                style={{ minHeight: 80 }}
                value={values[f.key] ?? ""}
                placeholder={f.placeholder}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              />
            ) : (
              <input
                className="input"
                type={f.type === "date" ? "date" : "text"}
                value={values[f.key] ?? ""}
                placeholder={f.placeholder}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              />
            )}
          </label>
        ))}
      </div>
      <div>
        <div className={`${styles.toolbar} no-print`}>
          <button type="button" className="btn btn-gold btn-small" onClick={print}>
            Print or save as PDF
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={downloadWord}>
            Download for Word
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={copyText}>
            {copied ? "Copied" : "Copy text"}
          </button>
        </div>
        <div className={styles.doc} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
