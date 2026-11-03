import { hiddenStaffIds } from "@/lib/hiddenStaff";
import { isCheckAccount } from "@/lib/session";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { loadRep } from "@/lib/teamView";
import { RepWork } from "../RepWork";

export const dynamic = "force-dynamic";

// One rep's work as their manager sees it: the same view the rep has, plus Move on each call.
export default async function RepView({ params }: PageProps<"/admin/reps/[id]">) {
  const me = await requireStaff();
  if (!me.manager) redirect("/admin");
  const { id } = await params;
  const r = await loadRep(id);
  if (!r) notFound();
  const { data: staff } = await db().from("staff").select("id, full_name, email, role, agreement_signed_at").eq("active", true);
  const hidden = await hiddenStaffIds();
  const reps = ((staff ?? []) as { id: string; full_name: string | null; email: string; role: string; agreement_signed_at: string | null }[]).filter((s) => !isCheckAccount(s.email) && !hidden.has(s.id) && (s.role === "admin" || !!s.agreement_signed_at)).map((s) => ({ id: s.id, name: s.full_name || s.email }));

  return (
    <>
      <Link href="/admin/reps" className="small">
        ← All reps
      </Link>
      <div className="page-head" style={{ paddingBottom: 8 }}>
        <h1>{r.name}</h1>
        <p>
          {r.email}
        </p>
      </div>
      <RepWork r={r} self={false} reps={reps} canMove />
    </>
  );
}
