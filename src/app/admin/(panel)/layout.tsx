import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { adminLogout } from "../actions";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaff();
  const admin = me.role === "admin";
  let q = db().from("contact_requests").select("id", { count: "exact", head: true }).eq("status", "new");
  if (!admin && me.id) q = q.contains("routed_to", [me.id]);
  const { count: openRequests } = await q;
  // Reps sign the rep agreement once before using the back office.
  if (!admin && me.id) {
    const { data, error } = await db().from("staff").select("*").eq("id", me.id).maybeSingle();
    if (!error && data && "agreement_signed_at" in data && !data.agreement_signed_at) redirect("/admin/agreement");
  }
  return (
    <div className="wrap">
      <nav className={styles.bar} aria-label="Admin">
        <Link href="/admin">{admin ? "Dashboard" : "My dashboard"}</Link>
        <Link href="/admin/candidates">Candidates</Link>
        {admin && <Link href="/admin/agreements">Introductions</Link>}
        {admin && <Link href="/admin/clients">Clients</Link>}
        {admin && <Link href="/admin/payments">Finance</Link>}
        <Link href="/admin/requests">
          Requests{openRequests ? <span className={styles.badge}>{openRequests}</span> : null}
        </Link>
        <Link href="/admin/calls">{admin ? "Calls" : "My calls"}</Link>
        {admin && <Link href="/admin/team">Team</Link>}
        <Link href="/admin/candidates/new" className={styles.addLink}>
          + Add candidate
        </Link>
        {admin ? (
          <details className={styles.more}>
            <summary>More</summary>
            <div>
              <Link href="/admin/share">Share with owners</Link>
              <Link href="/admin/hours">My hours</Link>
              <Link href="/admin/invite">Invite a rep</Link>
              <Link href="/admin/settings">Fee settings</Link>
              <Link href="/admin/activity">Activity</Link>
              <Link href="/admin/guide">Rep guide</Link>
            </div>
          </details>
        ) : (
          <>
            <Link href="/admin/share">Share with owners</Link>
            <Link href="/admin/hours">My hours</Link>
            <Link href="/admin/guide">Rep guide</Link>
          </>
        )}
        <Link href="/admin/password" className={styles.me} title="Change your password">
          {me.name}
          {admin ? "" : " (rep)"}
        </Link>
        <form action={adminLogout} className={styles.out}>
          <button type="submit">Sign out</button>
        </form>
      </nav>
      {children}
    </div>
  );
}
