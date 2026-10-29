import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { nowMs } from "@/lib/time";
import { commissionPercent } from "@/lib/settings";
import { workEmailDomain } from "@/lib/format";
import { RepDashboard } from "../../RepDashboard";
import { RepTerms } from "./RepTerms";

export const dynamic = "force-dynamic";

// Heshy's view of one rep's dashboard.
export default async function RepView({ params }: PageProps<"/admin/team/[id]">) {
  const { id } = await params;
  await requireAdmin();
  const { data } = await db().from("staff").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const pct = await commissionPercent();
  return (
    <>
      <p style={{ marginTop: 16 }}>
        <Link href="/admin/team" className="small muted">
          Team
        </Link>
      </p>
      <RepTerms
        staffId={data.id}
        name={data.full_name || data.email}
        defaultPercent={pct}
        type={data.commission_type}
        value={data.commission_value}
        note={data.commission_note}
        sentAt={data.package_sent_at}
        signedAt={data.agreement_signed_at}
        isRep={data.role === "rep"}
        email={data.email}
        domain={workEmailDomain()}
      />
      <RepDashboard staffId={data.id} name={data.full_name || data.email} self={false} nowIso={new Date(nowMs()).toISOString()} />
    </>
  );
}
