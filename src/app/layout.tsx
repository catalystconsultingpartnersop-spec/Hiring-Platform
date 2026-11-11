import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
import "./globals.css";
import { brandName } from "@/lib/format";
import { currentCandidateId, currentOwner } from "@/lib/session";
import { ShortlistLink, ShortlistSync } from "@/components/Shortlist";
import { Logo } from "@/components/Logo";
import { legalEntity } from "@/lib/agreement";
import { siteUrl } from "@/lib/format";
import { candidateOnly } from "@/lib/candidateMode";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${brandName()} — browse coached, assessed candidates`, template: `%s | ${brandName()}` },
  description:
    "Browse candidates who have been coached and assessed. Sign to see who they are. Pay one flat fee when you decide to hire.",
  // The picture that shows when someone pastes our link (WhatsApp, iMessage, LinkedIn, email).
  openGraph: {
    type: "website",
    siteName: brandName(),
    title: "Dear business owner, unimpressed with your hiring options?",
    description: "We’re business owners too. See the hiring experience we built: candidates met and coached first, and you choose for yourself.",
    images: [{ url: "/share/og.png", width: 1200, height: 630, alt: "Dear business owner, unimpressed with your hiring options?" }],
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
            {onlyCandidate ? (
              <nav className="nav" aria-label="Main">
                <Link href={P("/join")} className="hide-sm">
                  Looking for work?
                </Link>
                <Link href={P("/mission")} className="hide-sm">
                  Our mission
                </Link>
                <Link href={P("/me")}>Your page</Link>
              </nav>
            ) : (
            <nav className="nav" aria-label="Main">
              <Link href={P("/candidates")}>
                <span className="hide-sm">Browse candidates</span>
                <span className="show-sm">Browse</span>
              </Link>
              <ShortlistLink base={site} />
              {signedIn && <ShortlistSync />}
              <Link href={P("/join")} className="hide-sm">
                Looking for work?
              </Link>
              <Link href={P("/hiring-help")} className="hide-sm">
                Hiring help
              </Link>
              {signedIn ? (
                <Link href={P("/account")}>
                  <span className="hide-sm">Your account</span>
                  <span className="show-sm">Account</span>
                </Link>
              ) : candidate ? (
                <Link href={P("/me")}>Your page</Link>
              ) : (
                <Link href={P("/login")}>Sign in</Link>
              )}
            </nav>
            )}
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
              <Link href={P("/candidates")}>Browse candidates</Link>
              <Link href={P("/hiring-help")}>Hiring help</Link>
              <Link href={P("/why")}>Why we started</Link>
              <Link href={P("/refer")}>Refer a business owner</Link>
              <Link href={P(signedIn ? "/account" : "/login")}>{signedIn ? "Your account" : "Sign in"}</Link>
            </nav>
            )}
            <nav aria-label="For candidates">
              <h3>For candidates</h3>
              <Link href={P("/join")}>Looking for work?</Link>
              <Link href={P("/join#career-help")}>Career help</Link>
              <Link href={P("/me")}>Your page</Link>
              <Link href={P("/mission")}>Our mission</Link>
            </nav>
            <div>
              <h3>Questions?</h3>
              <Link href={P("/contact")}>Contact us</Link>
            </div>
          </div>
          <div className="wrap footer-bottom">
            <span>
              &copy; {new Date().getFullYear()} {legalEntity()}. {brandName()} is a service of {legalEntity()}.
            </span>
            <span style={{ display: "inline-flex", gap: 16 }}>
              {/* Someone hiring who arrived through a candidate link can always get to the business side. */}
              {onlyCandidate && <Link href={P("/candidates?for=business")}>Hiring? Browse candidates</Link>}
              <Link href={P("/privacy")}>Privacy</Link>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
