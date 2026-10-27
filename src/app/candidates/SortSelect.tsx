"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

// A dropdown that sets one URL parameter (e.g. sort or industry) and reloads results.
export function ParamSelect({
  param,
  label,
  value,
  options,
}: {
  param: string;
  label: string;
  value: string;
  options: [string, string][];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="sort-select">
      <span>{label}</span>
      <select
        className="select"
        value={value}
        onChange={(e) => {
          const sp = new URLSearchParams(params.toString());
          if (e.target.value) sp.set(param, e.target.value);
          else sp.delete(param);
          const s = sp.toString();
          router.push(s ? `${pathname}?${s}` : pathname);
        }}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
