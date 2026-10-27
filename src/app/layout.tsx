import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
import "./globals.css";
import { brandName } from "@/lib/format";
import { currentOwner } from "@/lib/session";
import { ShortlistLink } from "@/components/Shortlist";

export const metadata: Metadata = {
  title: `${brandName()} — browse coached, assessed candidates`,
  description:
    "Browse candidates who have been coached and assessed. Sign to see who they are. Pay one flat fee when you decide to hire.",
};

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
              {brandName()}
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
            <Link href="/apply">Apply as a candidate</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
