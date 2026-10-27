import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { nowMs } from "@/lib/time";
import { RepDashboard } from "../../RepDashboard";

export const dynamic = "force-dynamic";

// Heshy's view of one rep's dashboard.
export default async function RepView({ params }: PageProps<"/admin/team/[id]">) {
  const { id } = await params;
  await requireAdmin();
  const { data } = await db().from("staff").select("id, full_name, email").eq("id", id).maybeSingle();
  if (!data) notFound();
  return (
    <>
      <p style={{ marginTop: 16 }}>
        <Link href="/admin/team" className="small muted">
          Team
        </Link>
      </p>
      <RepDashboard staffId={data.id} name={data.full_name || data.email} self={false} nowIso={new Date(nowMs()).toISOString()} />
    </>
  );
}
