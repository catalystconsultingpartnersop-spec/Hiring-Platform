"use client";

import { useEffect } from "react";
import { markStep, type Step } from "@/app/funnel";

// Counts one step for this visit (once per browser tab session per step).
export function mark(step: Step, once = true) {
  try {
    if (once) {
      const k = `tcc_step_${step}`;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
    }
  } catch {
    /* private mode: count anyway */
  }
  markStep(step).catch(() => {});
}

// Drop on a page to count that it was seen.
export function Seen({ step }: { step: Step }) {
  useEffect(() => mark(step), [step]);
  return null;
}
