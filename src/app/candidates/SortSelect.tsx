"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="sort-select">
      <span>Sort by</span>
      <select
        className="select"
        value={value}
        onChange={(e) => {
          const sp = new URLSearchParams(params.toString());
          if (e.target.value) sp.set("sort", e.target.value);
          else sp.delete("sort");
          const s = sp.toString();
          router.push(s ? `${pathname}?${s}` : pathname);
        }}
      >
        <option value="">Newest</option>
        <option value="fee">Fee: low to high</option>
        <option value="pay">Salary: low to high</option>
        <option value="experience">Most experienced</option>
      </select>
    </label>
  );
}
