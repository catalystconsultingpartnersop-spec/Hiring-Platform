import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AgreementDoc } from "@/components/AgreementDoc";
import { PrintButton } from "@/components/PrintButton";
import { db } from "@/lib/db";
import { brandName } from "@/lib/format";

import { REP_AGREEMENT_VERSION, repAgreementText, repTerms } from "@/lib/repAgreement";
import { FINDER_PCT } from "@/lib/finder";
import { requireStaff } from "@/lib/session";
import { commissionPercent } from "@/lib/settings";
import { SignRep } from "./SignRep";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Rep agreement" };

type Row = {
  id: string;
  full_name: string | null;
  email: string;
  agreement_signed_at: string | null;
  agreement_name: string | null;
  agreement_version: string | null;
  agreement_text: string | null;
  agreement_ip: string | null;
  commission_type?: string | null;
  commission_value?: number | null;
};

// A rep signs this once, before using the back office. Heshy can open any rep's
// signed copy with ?id=.
export default async function RepAgreementPage({ searchParams }: PageProps<"/admin/agreement">) {
  const sp = await searchParams;
  const me = await requireStaff();
  const viewId = typeof sp.id === "string" && me.role === "admin" ? sp.id : me.id;
  if (!viewId) redirect("/admin");
  const { data } = await db().from("staff").select("*").eq("id", viewId).maybeSingle();
  const row = data as Row | null;
  if (!row) redirect("/admin");

  if (row.agreement_signed_at && row.agreement_text) {
    return (
      <div className="wrap" style={{ maxWidth: 820, paddingTop: 24, paddingBottom: 56 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <Link href={viewId === me.id ? "/admin" : "/admin/team"} className="small muted no-print">
            {viewId === me.id ? "Your dashboard" : "Team"}
          </Link>
          <PrintButton />
        </div>
        {sp.signed === "1" && (
          <p className="notice notice-good" style={{ marginTop: 16 }}>
            Welcome aboard. Thank you for caring about candidates. Next: <Link href="/admin/guide">read the rep guide</Link>{" "}
            and <Link href="/admin/hours">set your hours</Link>.
          </p>
        )}
        {(row.agreement_version ?? "") < REP_AGREEMENT_VERSION && (
          <div className="panel" style={{ marginTop: 16, background: "#fff8e1", borderColor: "#f3d27a" }}>
            <p style={{ margin: "0 0 6px", fontWeight: 800 }}>Added November 5, 2026: your introduction share</p>
            <p style={{ margin: "0 0 6px" }}>
              On top of your commission below, when you introduce a business owner through the site and they hire, you earn{" "}
              <b>{FINDER_PCT}% of the fee we collect</b> for that hire, on anyone&rsquo;s candidate, yours included. Your main work
              is still with candidates; this is an extra.
            </p>
            <p className="small muted" style={{ margin: 0 }}>
              It counts only when the site records the introduction: you used Suggest on the candidate, or the owner signed up
              through your link. Introductions made outside the site can&rsquo;t be tracked, so they aren&rsquo;t credited. If two
              people introduced the same owner to the same candidate, the first one recorded counts. Paid on the same schedule as
              your commission. Commissions are private.
            </p>
          </div>
        )}
        <div style={{ marginTop: 18 }}>
          <AgreementDoc
            text={row.agreement_text}
            signature={{
              name: row.agreement_name ?? "",
              company: row.full_name ?? row.email,
              email: row.email,
              signedAt: row.agreement_signed_at,
              ip: row.agreement_ip,
              version: row.agreement_version ?? undefined,
            }}
          />
        </div>
      </div>
    );
  }

  if (viewId !== me.id) {
    return (
      <div className="wrap narrow" style={{ paddingTop: 24 }}>
        <p className="notice">{row.full_name || row.email} hasn&rsquo;t signed the rep agreement yet. They&rsquo;ll be asked the next time they sign in.</p>
      </div>
    );
  }

  const text = repAgreementText({ brand: brandName(), repName: row.full_name ?? "", ...repTerms(row, await commissionPercent()) });
  return (
    <div className="wrap" style={{ maxWidth: 820, paddingTop: 24, paddingBottom: 56 }}>
      <div className="page-head" style={{ paddingBottom: 8 }}>
        <h1>Welcome, {(row.full_name ?? "").split(" ")[0] || "and thank you"}.</h1>
        <p>
          Before you start, one thing matters most: you&rsquo;re here because you care about candidates and want to help
          them. If that&rsquo;s you, read this short agreement and sign below. It takes about three minutes.
        </p>
      </div>
      <div style={{ maxHeight: 520, overflow: "auto", border: "1px solid var(--line)", borderRadius: 16, padding: 4 }}>
        <AgreementDoc text={text} />
      </div>
      <SignRep defaultName={row.full_name ?? ""} />
    </div>
  );
}
