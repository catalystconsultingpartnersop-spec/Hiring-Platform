"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

// A menu link that knows when you're on its page.
export function NavLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const path = usePathname();
  useSearchParams();
  const base = href.split("?")[0];
  const on = base === "/admin" ? path === "/admin" : path === base || (path.startsWith(base + "/") && !(base === "/admin/candidates" && path === "/admin/candidates/new"));
  return (
    <Link href={href} className={className} aria-current={on ? "page" : undefined}>
      {children}
    </Link>
  );
}
