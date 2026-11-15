"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ShortlistLink } from "./Shortlist";

// The site's top menu. One row on a computer; on a phone, the main button plus a
// Menu that opens the full list. It follows the side of the site you're on:
// business pages lead to "Meet the team", candidate pages to "Become a candidate".
export function SiteNav({ base, signedIn, candidate, onlyCandidate }: { base: string; signedIn: boolean; candidate: boolean; onlyCandidate: boolean }) {
  const path = usePathname();
  const P = (p: string) => base + p;
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [path]);
  useEffect(() => {
    const close = (e: Event) => {
      const d = menu.current;
      if (!d?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !d.contains(e.target as Node) || (e.target as HTMLElement).closest("a")) d.open = false;
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  // The team's back office has its own menu right below: keep this bar to the logo.
  if (base || path.startsWith("/admin")) return <span className="nav-team" />;

  const candSide = onlyCandidate || ["/join", "/apply", "/me", "/mission"].some((p) => path === p || path.startsWith(p + "/"));
  const on = (p: string) => (path === p || path.startsWith(p + "/") ? ("page" as const) : undefined);
  const A = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <Link href={P(href)} className={className} aria-current={on(href)}>
      {children}
    </Link>
  );
  const ownerSign = signedIn ? <A href="/account">Your account</A> : <A href="/login">{candSide ? "Business sign in" : "Sign in"}</A>;
  const candSign = <A href="/me">{candidate ? "Your page" : candSide ? "Sign in" : "Candidate sign in"}</A>;

  return (
    <>
      <nav className="nav nav-main" aria-label="Main">
        {candSide ? (
          <>
            <A href="/join">Looking for work?</A>
            <A href="/mission">Our mission</A>
          </>
        ) : (
          <>
            <A href="/candidates">Browse candidates</A>
            <A href="/how-it-works">How it works</A>
            <A href="/hiring-help" className="hide-md">Hiring help</A>
            <ShortlistLink base={base} hideEmpty />
          </>
        )}
      </nav>
      <nav className="nav nav-side" aria-label="Account">
        {candSide ? (
          <>
            {!onlyCandidate && <Link href={P("/")} className="nav-other">Looking to hire?</Link>}
            {candSign}
          </>
        ) : (
          <>
            <A href="/join" className="nav-other">Looking for work?</A>
            {signedIn ? ownerSign : candidate ? candSign : ownerSign}
          </>
        )}
      </nav>
      {candSide ? (
        !candidate && (
          <Link href={P("/apply")} className="btn btn-gold btn-small nav-cta">
            <span className="hide-sm">Become a candidate</span>
            <span className="show-sm">Join</span>
          </Link>
        )
      ) : (
        <Link href={P("/meet")} className="btn btn-gold btn-small nav-cta">
          <span className="hide-sm">Meet the team</span>
          <span className="show-sm">Meet us</span>
        </Link>
      )}
      <details ref={menu} className="nav-menu">
        <summary aria-label="Menu">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <span>Menu</span>
        </summary>
        <div>
          {!onlyCandidate && (
            <>
              <h3>For businesses</h3>
              <A href="/meet">Meet the team</A>
              <A href="/candidates">Browse candidates</A>
              <ShortlistLink base={base} hideEmpty />
              <A href="/how-it-works">How it works</A>
              <A href="/hiring-help">Hiring help</A>
              <A href={signedIn ? "/account" : "/login"}>{signedIn ? "Your account" : "Business sign in"}</A>
            </>
          )}
          <h3>For candidates</h3>
          <A href="/join">Looking for work?</A>
          <A href="/mission">Our mission</A>
          <A href="/me">{candidate ? "Your page" : "Candidate sign in"}</A>
          <hr />
          <A href="/contact">Contact us</A>
        </div>
      </details>
    </>
  );
}
