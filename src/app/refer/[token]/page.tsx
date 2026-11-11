import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { finderSharesFor, loadAgreements } from "@/lib/adminData";
import { FINDER_PCT } from "@/lib/finder";
import { money } from "@/lib/format";
import { ownersReferredBy, referLink, referrerByToken } from "@/lib/referrers";
import { ShareBox } from "./ShareBox";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your referral link", robots: { index: false } };

// A referral partner's own page: their link, ready-to-send message, and how it's going.
export default async function ReferrerPage({ params, searchParams }: PageProps<"/refer/[token]">) {
  const { token } = await params;
  const sp = await searchParams;
  const r = await referrerByToken(token);
  if (!r) notFound();
  const [owners, shares] = await Promise.all([ownersReferredBy(r.code), finderSharesFor((await loadAgreements()).rows)]);
  const mine = [...shares.values()].filter((f) => f.staffId === `ref:${r.code}`);
  const earned = mine.reduce((t, f) => t + f.cents, 0);
  const paid = mine.filter((f) => f.paidAt).reduce((t, f) => t + f.cents, 0);
  const link = referLink(r);
  const first = r.name.split(" ")[0];
  const message = `Hi! If you're hiring, take a look at The Candidate Collection: ${link}\nEvery candidate there has been personally met by their team, and you browse them yourself. A flat $5,000 fee, only if you hire.`;
  return (
    <div className="wrap narrow" style={{ maxWidth: 720, paddingBottom: 56 }}>
      <div className="page-head">
        <h1>{sp.new ? `You're all set, ${first}` : `Hi ${first}`}</h1>
        <p>{sp.new ? "We also emailed you this page so you can come back any time." : "Your link, and how it's going."}</p>
      </div>
      {r.off && <p className="notice notice-bad">This link is paused. Questions? Reach us through the Contact page.</p>}
      <ShareBox link={link} message={message} />
      <div className="panel" style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 18, margin: "0 0 10px" }}>How it&rsquo;s going</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          <div>
            <strong style={{ fontSize: 26 }}>{owners.length}</strong>
            <div className="small muted">business owner{owners.length === 1 ? "" : "s"} signed up through your link</div>
          </div>
          <div>
            <strong style={{ fontSize: 26 }}>{mine.length}</strong>
            <div className="small muted">hire{mine.length === 1 ? "" : "s"}</div>
          </div>
          <div>
            <strong style={{ fontSize: 26 }}>{money(earned)}</strong>
            <div className="small muted">earned{paid ? `, ${money(paid)} paid` : ""}</div>
          </div>
        </div>
        <p className="small muted" style={{ margin: "12px 0 0" }}>
          You get {FINDER_PCT}% of our fee on each hire, paid within 30 days after we collect the fee and the candidate starts work.
          {r.pay ? ` We'll pay you by: ${r.pay}.` : " We'll reach out to ask how you'd like to be paid."}
        </p>
      </div>
    </div>
  );
}
