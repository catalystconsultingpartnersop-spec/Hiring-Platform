import type { Metadata } from "next";
import { legalEntity } from "@/lib/agreement";
import { brandName, contactPhone } from "@/lib/format";

export const metadata: Metadata = { title: `Privacy policy | ${brandName()}` };

const UPDATED = "October 28, 2026";

export default function PrivacyPage() {
  const brand = brandName();
  const email = process.env.ADMIN_EMAIL ?? "";
  return (
    <div className="wrap narrow" style={{ paddingTop: 40, paddingBottom: 64, lineHeight: 1.7 }}>
      <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(32px,5vw,48px)", margin: 0 }}>Privacy policy</h1>
      <p className="muted">Last updated {UPDATED}</p>

      <p>
        {brand} is run by {legalEntity()} (&ldquo;we&rdquo;). This policy explains what information we collect, how we
        use it, and the choices you have. We keep it simple: we only collect what we need to help candidates find the
        right work and help businesses hire them.
      </p>

      <h2>What we collect</h2>
      <p>
        <strong>From candidates:</strong> your name, email, phone number, what you&rsquo;re looking for, your resume if
        you share it, your assessment results, notes from your conversations with our team, and any companies you ask
        us never to show you to.
      </p>
      <p>
        <strong>From businesses:</strong> your name, company, email, phone number, the agreements you sign (including
        the date, time and device used), and your payment details. Card details are handled by our payment processor,
        Stripe; we never see or store your full card number.
      </p>
      <p>
        <strong>If you sign in with Google:</strong> we receive only your name and email address from Google. We
        don&rsquo;t access anything else in your Google account.
      </p>
      <p>
        <strong>Automatically:</strong> basic technical information such as your IP address and browser, used to keep
        the site secure and to record agreements.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>To coach candidates and create their profiles.</li>
        <li>To show businesses anonymous candidate profiles, and to share a candidate&rsquo;s identity and contact details only with a business that has signed an agreement for that candidate.</li>
        <li>To schedule calls, send emails about your account, agreements, payments and receipts.</li>
        <li>To process payments and refunds, and to keep records required by law.</li>
        <li>To keep the site safe and working.</li>
      </ul>
      <p>We don&rsquo;t sell your information, and we don&rsquo;t use it for advertising.</p>

      <h2>Who we share it with</h2>
      <ul>
        <li><strong>Businesses you&rsquo;re matched with:</strong> candidate details are shared only after a business signs an agreement, and never with companies the candidate asked to be hidden from (as far as we can tell from their company name and email address).</li>
        <li><strong>Service providers</strong> who run parts of the site for us: hosting (Vercel), database (Supabase), payments (Stripe), email delivery (Resend) and sign-in (Google). They may only use the information to provide their service to us.</li>
        <li><strong>When the law requires it</strong>, or to protect our rights and the safety of others.</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        We keep information while your account is active and as long as needed for the purposes above, including our
        legal, tax and accounting obligations. Signed agreements and payment records are kept for at least as long as
        the law requires.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask us to see, correct or delete your information, or to take a candidate profile off the site, at any
        time. Contact us using the details below and we&rsquo;ll respond promptly. Some records, such as signed
        agreements and payments, may need to be kept for legal reasons.
      </p>

      <h2>Security</h2>
      <p>
        We protect your information with access controls, encrypted connections and trusted providers. No system is
        perfectly secure, but we work hard to keep your information safe.
      </p>

      <h2>Children</h2>
      <p>This site is for adults. We don&rsquo;t knowingly collect information from anyone under 18.</p>

      <h2>Changes</h2>
      <p>If we change this policy, we&rsquo;ll update the date above and, for important changes, let you know.</p>

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
        Phone or text: {contactPhone()}
      </p>
    </div>
  );
}
