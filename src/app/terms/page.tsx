import type { Metadata } from "next";
import Link from "next/link";
import { legalEntity } from "@/lib/agreement";
import { brandName } from "@/lib/format";

export const metadata: Metadata = { title: "Terms of use", description: "The terms for using The Candidate Collection, in plain language." };

const UPDATED = "November 13, 2026";

// The general terms for using the site. The fee itself is governed by the
// agreement a business signs for each candidate; this page points to it and
// never restates the numbers. Have a lawyer review before relying on it.
export default function TermsPage() {
  const brand = brandName();
  const email = process.env.ADMIN_EMAIL ?? "";
  return (
    <div className="wrap narrow" style={{ paddingTop: 40, paddingBottom: 64, lineHeight: 1.7 }}>
      <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(32px,5vw,48px)", margin: 0 }}>Terms of use</h1>
      <p className="muted">Last updated {UPDATED}</p>

      <p>
        {brand} is run by {legalEntity()} (&ldquo;we&rdquo;). These terms cover your use of our site and our service. By
        using the site, you agree to them. We&rsquo;ve kept them in plain language.
      </p>

      <h2>What we do</h2>
      <p>
        We meet candidates, get to know how they work, and introduce them to businesses that are hiring. Candidate
        profiles on the site are anonymous. A business sees a candidate&rsquo;s name and contact details only after it
        signs an agreement for that candidate.
      </p>

      <h2>For businesses</h2>
      <ul>
        <li>You can browse profiles and talk with our team without owing anything.</li>
        <li>
          To meet a candidate, you sign our Candidate Introduction and Placement Fee Agreement for that candidate. That
          agreement sets out the flat fee, when it is owed, and the refund terms. If it and these terms ever disagree,
          the signed agreement controls. See <Link href="/billing">our billing philosophy</Link>.
        </li>
        <li>
          A candidate&rsquo;s identity and details are for your own hiring only. Please don&rsquo;t share them outside
          your company.
        </li>
        <li>Every hiring decision is yours, including interviews, reference checks and compliance with employment laws.</li>
      </ul>

      <h2>For candidates</h2>
      <ul>
        <li>We never charge candidates.</li>
        <li>
          Before your profile goes live, you sign a short candidate agreement: you&rsquo;ll let us know if you&rsquo;re
          hired, and keep your details accurate.
        </li>
        <li>You can ask us to pause or remove your profile at any time.</li>
        <li>We can&rsquo;t promise that you&rsquo;ll be hired, and we choose which profiles appear on the site.</li>
      </ul>

      <h2>Using the site fairly</h2>
      <p>Please use the site honestly and for its purpose. That means you agree not to:</p>
      <ul>
        <li>give false information, or sign in as someone else;</li>
        <li>try to identify or contact a candidate without signing the agreement for that candidate;</li>
        <li>copy, scrape or republish profiles or other content from the site;</li>
        <li>interfere with the site or try to get into parts of it that aren&rsquo;t yours.</li>
      </ul>
      <p>We may pause or close an account that breaks these terms.</p>

      <h2>Your account</h2>
      <p>
        Keep your sign-in details to yourself, and tell us if you think someone else has used your account. You&rsquo;re
        responsible for what happens under your account.
      </p>

      <h2>Emails and text messages</h2>
      <p>
        We send emails about your account, your calls and the people you&rsquo;re meeting. If you give us a mobile
        number and agree to texts, we may also text you about the same things, such as a booked call or a reply waiting
        for you. Message frequency varies. Message and data rates may apply. Reply STOP to stop texts at any time, or
        HELP for help. We don&rsquo;t sell or share mobile numbers for marketing. See our{" "}
        <Link href="/privacy">privacy policy</Link>.
      </p>

      <h2>Our content</h2>
      <p>
        The site, its design, and the profiles and articles on it belong to us. The templates and articles in Hiring
        help are general information, not legal advice. Please check with your own advisor before relying on them.
      </p>

      <h2>What we don&rsquo;t promise</h2>
      <p>
        We work hard to describe every candidate accurately, and we share what we learned from meeting them. We provide
        introductions; we don&rsquo;t guarantee a candidate&rsquo;s qualifications, availability or performance, and we
        are not anyone&rsquo;s employer. The site is provided as it is, and it may occasionally be unavailable.
      </p>

      <h2>Limit of liability</h2>
      <p>
        To the fullest extent the law allows, we are not liable for indirect or consequential losses or lost profits
        from using the site. Our total liability relating to the site will not exceed the fees you paid us in the 12
        months before the claim.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of the State of New York. Any dispute will be brought in the state or
        federal courts located in New York County, New York.
      </p>

      <h2>Changes</h2>
      <p>If we change these terms, we&rsquo;ll update the date above and, for important changes, let you know.</p>

      <h2>Contact us</h2>
      <p>
        {legalEntity()}, doing business as {brand}
        <br />
        {email && (
          <>
            Email: <a href={`mailto:${email}`}>{email}</a>
            <br />
          </>
        )}
        Or use our <a href="/contact">Contact us</a> page.
      </p>
    </div>
  );
}
