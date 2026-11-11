import type { Metadata } from "next";
import { FINDER_PCT } from "@/lib/finder";
import { ReferForm } from "./ReferForm";

export const metadata: Metadata = {
  title: "Refer a business owner",
  description: "Know a business owner who's hiring? Send them our way with your own link, and get a thank-you when they hire.",
};

export default function ReferPage() {
  return (
    <div className="wrap narrow" style={{ maxWidth: 720, paddingBottom: 56 }}>
      <div className="page-head">
        <h1>Know a business owner who&rsquo;s hiring?</h1>
        <p>Send them our way with your own link. When they hire someone through us, we send you a thank-you.</p>
      </div>
      <div className="panel panel-wash" style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 18, margin: "0 0 10px" }}>How it works</h2>
        <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6 }}>
          <li>Sign up below. It takes a minute, and you get your own link.</li>
          <li>Send it to business owners you know who are hiring.</li>
          <li>
            When an owner who signed up through your link hires someone through us, we send you <strong>{FINDER_PCT}% of our fee</strong>: $250 on a
            standard $5,000 hire. Paid within 30 days after we collect the fee and the candidate starts work.
          </li>
        </ol>
        <p className="small muted" style={{ margin: "12px 0 0" }}>
          The owner needs to sign up within 90 days of opening your link, on the same device. Owners who already had an account with us, and your own
          business, don&rsquo;t count. We can only credit owners who come through your link.
        </p>
      </div>
      <ReferForm />
    </div>
  );
}
