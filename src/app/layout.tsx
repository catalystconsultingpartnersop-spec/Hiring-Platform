import type { Metadata } from "next";
import { Visits } from "@/components/Visits";
import Link from "next/link";
import { headers } from "next/headers";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
import "./globals.css";
import { brandName } from "@/lib/format";
import { currentCandidateId, currentOwner } from "@/lib/session";
import { ShortlistSync } from "@/components/Shortlist";
import { SiteNav } from "@/components/SiteNav";
import { Logo } from "@/components/Logo";
import { legalEntity } from "@/lib/agreement";
import { siteUrl, teamUrl } from "@/lib/format";
import { candidateOnly } from "@/lib/candidateMode";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${brandName()} | A revolutionary way to hire`, template: `%s | ${brandName()}` },
  description:
    "Looking to hire? We already met your next candidate. Tell us what you need, and half an hour later you can have a qualified candidate to consider.",
  // The picture that shows when someone pastes our link (WhatsApp, iMessage, LinkedIn, email).
  openGraph: {
    type: "website",
    siteName: brandName(),
    title: "Looking to hire? We already met your next candidate.",
    description: "Qualified candidates, vetted and ready to roll. Tell us what you need, and half an hour later you can have a qualified candidate to consider.",
    images: [{ url: "/share/og.png", width: 1200, height: 630, alt: "Looking to hire? We already met your next candidate." }],
  },
  twitter: { card: "summary_large_image", images: ["/share/og.png"] },
  // Proves to Google Search Console that we own the site.
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || "cS6fXQteFm1gS0ZYCfRLie7X_aR71QiR9RelnatPtIo" },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  let signedIn = false;
  let candidate = false;
  let onlyCandidate = false;
  // On the back-office address (team.…) public pages live on the main site, so link
  // there directly instead of through a redirect the browser can't prefetch.
  const host = ((await headers()).get("host") ?? "").toLowerCase();
  const site = host.startsWith("team.") ? siteUrl().replace(/\/$/, "") : "";
  const P = (p: string) => site + p;
  try {
    onlyCandidate = await candidateOnly();
    signedIn = !!(await currentOwner());
    candidate = !signedIn && !!(await currentCandidateId());
  } catch {
    signedIn = false;
  }
  return (
    <html lang="en">
      <body>
        {/* Tells Google the site's name, so searching "The Candidate Collection" finds it. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: brandName(),
              alternateName: ["Candidate Collection", "thecandidatecollection.com"],
              url: siteUrl(),
            }),
          }}
        />
        <header className="site-header">
          <div className="wrap">
            <Link href={site ? "/admin" : onlyCandidate ? "/join" : "/"} className="brand" aria-label={`${brandName()} home`}>
              <Logo tagline />
            </Link>
            <SiteNav base={site} signedIn={signedIn} candidate={candidate} onlyCandidate={onlyCandidate} />
            {signedIn && <ShortlistSync />}
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="wrap footer-grid">
            <div className="footer-brand">
              <Logo tagline />
              <p>
                We sit down with every candidate to discover their natural strengths, so the people you meet here are
                ready for work that truly fits them.
              </p>
            </div>
            {!onlyCandidate && (
            <nav aria-label="For businesses">
              <h3>For businesses</h3>
              <Link href={P("/meet")}>Meet the team</Link>
              <Link href={P("/how-it-works")}>How it works</Link>
              <Link href={P("/candidates")}>Browse candidates</Link>
              <Link href={P("/hiring-help")}>Hiring help</Link>
              <Link href={P("/billing")}>Billing philosophy</Link>
              <Link href={P(signedIn ? "/account" : "/login")}>{signedIn ? "Your account" : "Business sign in"}</Link>
            </nav>
            )}
            <nav aria-label="For candidates">
              <h3>For candidates</h3>
              <Link href={P("/join")}>Looking for work?</Link>
              <Link href={P("/join#career-help")}>Career help</Link>
              <Link href={P("/me")}>Candidate sign in</Link>
            </nav>
            <nav aria-label="About us">
              <h3>About us</h3>
              <Link href={P("/mission")}>Our mission</Link>
              {!onlyCandidate && <Link href={P("/refer")}>Refer a business owner</Link>}
              <Link href={P("/contact")}>Contact us</Link>
            </nav>
          </div>
          <div className="wrap footer-bottom">
            <span>
              &copy; {new Date().getFullYear()} {legalEntity()}. {brandName()} is a service of {legalEntity()}.
            </span>
            <span style={{ display: "inline-flex", gap: 16 }}>
              {/* Someone hiring who arrived through a candidate link can always get to the business side. */}
              {onlyCandidate && <Link href={P("/candidates?for=business")}>Hiring? Browse candidates</Link>}
              <Link href={P("/terms")}>Terms</Link>
              <Link href={P("/privacy")}>Privacy</Link>
              <a href={`${teamUrl()}/admin/login`}>Team sign in</a>
            </span>
          </div>
        </footer>
        <Visits />
      </body>
    </html>
  );
}
