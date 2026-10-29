import Link from "next/link";
import { requireStaff } from "@/lib/session";
import { adminLogout } from "../actions";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaff();
  const admin = me.role === "admin";
  return (
    <div className="wrap">
      <nav className={styles.bar} aria-label="Admin">
        <Link href="/admin">{admin ? "Dashboard" : "My dashboard"}</Link>
        <Link href="/admin/candidates">Candidates</Link>
        {admin && <Link href="/admin/clients">Clients</Link>}
        {admin && <Link href="/admin/agreements">Agreements</Link>}
        {admin && <Link href="/admin/payments">Payments</Link>}
        <Link href="/admin/calls">{admin ? "Calls" : "My calls"}</Link>
        <Link href="/admin/hours">My hours</Link>
        <Link href="/admin/candidates/new" className={styles.addLink}>
          + Add candidate
        </Link>
        {admin && <Link href="/admin/team">Team</Link>}
        {admin && <Link href="/admin/settings">Fee settings</Link>}
        {admin && <Link href="/admin/activity">Activity</Link>}
        <Link href="/admin/guide">Rep guide</Link>
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
