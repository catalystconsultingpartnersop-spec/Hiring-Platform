import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { adminLogout } from "../actions";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="wrap">
      <nav className={styles.bar} aria-label="Admin">
        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/candidates/new">Add candidate</Link>
        <Link href="/admin/settings">Fees</Link>
        <Link href="/admin/activity">Activity</Link>
        <form action={adminLogout} className={styles.out}>
          <button type="submit">Sign out</button>
        </form>
      </nav>
      {children}
    </div>
  );
}
