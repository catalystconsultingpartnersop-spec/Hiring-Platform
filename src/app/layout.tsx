import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
import "./globals.css";
import { brandName, contactPhone, contactPhoneHref } from "@/lib/format";
import { currentOwner } from "@/lib/session";
import { ShortlistLink } from "@/components/Shortlist";

export const metadata: Metadata = {
  title: `${brandName()} — browse coached, assessed candidates`,
  description:
    "Browse candidates who have been coached and assessed. Sign to see who they are. Pay one flat fee when you decide to hire.",
};

// The last word of the name in gold, e.g. "The Candidate Collection".
function BrandWord({ name }: { name: string }) {
  const i = name.lastIndexOf(" ");
  if (i < 0) return <>{name}</>;
  return (
    <>
      {name.slice(0, i)} <span className="brand-accent">{name.slice(i + 1)}</span>
    </>
  );
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  let signedIn = false;
  try {
    signedIn = !!(await currentOwner());
  } catch {
    signedIn = false;
  }
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="wrap">
            <Link href="/" className="brand">
              <span className="brand-mark" aria-hidden="true" />
              <BrandWord name={brandName()} />
            </Link>
            <nav className="nav" aria-label="Main">
              <Link href="/candidates">
                <span className="hide-sm">Browse candidates</span>
                <span className="show-sm">Browse</span>
              </Link>
              <ShortlistLink />
              <Link href="/apply" className="hide-sm">
                Looking for work?
              </Link>
              {signedIn && (
                <Link href="/hiring-help" className="hide-sm">
                  Hiring help
                </Link>
              )}
              {signedIn ? <Link href="/account">Your account</Link> : <Link href="/login">Sign in</Link>}
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="wrap">
            <span>
              {brandName()}: candidates are coached and assessed. You choose, and you pay one flat fee when you hire.
            </span>
            <span>
              Questions? Text or call <a href={`sms:${contactPhoneHref()}`}>{contactPhone()}</a>
              {" · "}
              <Link href="/apply">Looking for work?</Link>
              {" · "}
              <Link href="/mission">Our mission</Link>
              {" · "}
              <Link href="/privacy">Privacy</Link>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
