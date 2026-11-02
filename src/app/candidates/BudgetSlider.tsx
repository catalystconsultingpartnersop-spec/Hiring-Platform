"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const MIN = 40000;
const MAX = 200000;
const STEP = 5000;
const k = (n: number) => `$${Math.round(n / 1000)}k`;

// "Your budget": slide to the most you can pay; candidates asking more drop out.
export function BudgetSlider({ value }: { value: number | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [v, setV] = useState(value ?? MAX);
  const apply = (n: number) => {
    const sp = new URLSearchParams(params.toString());
    if (n >= MAX) sp.delete("maxpay");
    else sp.set("maxpay", String(n));
    const s = sp.toString();
    router.push(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };
  return (
    <div className="budget">
      <div className="budget-value">{v >= MAX ? "Any salary" : `Up to ${k(v)}`}</div>
      <input
        type="range"
        min={MIN}
        max={MAX}
        step={STEP}
        value={v}
        aria-label="Most you can pay"
        onChange={(e) => setV(Number(e.target.value))}
        onPointerUp={(e) => apply(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => apply(Number((e.target as HTMLInputElement).value))}
      />
      <div className="budget-ends">
        <span>{k(MIN)}</span>
        <span>{k(MAX)}+</span>
      </div>
    </div>
  );
}
