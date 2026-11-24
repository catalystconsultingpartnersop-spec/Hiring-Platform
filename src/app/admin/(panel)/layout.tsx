import Link from "next/link";
import { MoreMenu } from "./MoreMenu";
import { Suspense } from "react";
import { NavProgress } from "./NavProgress";
import { NavLink } from "./NavLink";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isMine, listThreads } from "@/lib/ownerMessages";
import { requireStaff } from "@/lib/session";
import { roomUnread } from "@/lib/roomNotify";
import { adminLogout } from "../actions";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaff();
  const admin = me.role === "admin";
  let q = db().from("contact_requests").select("id", { count: "exact", head: true }).eq("status", "new");
  if (!admin && me.id) q = q.contains("routed_to", [me.id]);
  const { count: openRequests } = await q;
  // Only conversations that are theirs to answer.
  const roomNew = await roomUnread(me.email).catch(() => 0);
  const waiting = (await listThreads(admin ? null : me.id).catch(() => [])).filter((t) => t.waiting && isMine(t, me)).length;
  // Reps sign the rep agreement once before using the back office.
  if (!admin && me.id) {
    const { data, error } = await db().from("staff").select("*").eq("id", me.id).maybeSingle();
    if (!error && data && "agreement_signed_at" in data && !data.agreement_signed_at) redirect("/admin/agreement");
  }
  return (
    <div className="wrap">
      <Suspense fallback={null}>
        <NavProgress />
      </Suspense>
      <nav className={styles.bar} aria-label="Admin">
        <Suspense fallback={null}>
          <div className={styles.links}>
            {!admin && me.manager && <NavLink href="/admin/reps">Team</NavLink>}
            <NavLink href={!admin && me.manager ? "/admin?mine=1" : "/admin"}>{admin ? "Dashboard" : "My dashboard"}</NavLink>
            <NavLink href="/admin/candidates">Browse candidates</NavLink>
            <NavLink href="/admin/matches">Matches</NavLink>
            <NavLink href="/admin/quick-intro">Quick intro</NavLink>
            {admin && <NavLink href="/admin/agreements">Introductions</NavLink>}
            <NavLink href="/admin/inbox">
              Inbox{waiting + (openRequests ?? 0) ? <span className={styles.badge}>{waiting + (openRequests ?? 0)}</span> : null}
            </NavLink>
            <NavLink href="/admin/room">
              Team Room{roomNew ? <span className={styles.badge}>{roomNew}</span> : null}
            </NavLink>
            {!admin && <NavLink href="/admin/calls">{me.manager ? "Calls" : "My calls"}</NavLink>}
          </div>
        </Suspense>
        <div className={styles.side}>
          <MoreMenu className={styles.more}>
            <summary>More</summary>
            <div>
              {admin && <Link href="/admin/calls">Calls</Link>}
              {admin && <Link href="/admin/clients">Clients</Link>}
              {admin && <Link href="/admin/payments">Finance</Link>}
              {me.manager && <Link href="/admin/analytics">Analytics</Link>}
              {admin && <Link href="/admin/reps">Reps</Link>}
              {admin && <Link href="/admin/team">Team</Link>}
              <Link href="/admin/share">Share kit</Link>
              {me.id && <Link href="/admin/booking-link">My booking link</Link>}
              <Link href="/admin/hours">My hours</Link>
              {admin && <Link href="/admin/invite">Invite a rep</Link>}
              <Link href="/admin/assessments">Strengths Assessment</Link>
              {admin && <Link href="/admin/settings">Fee settings</Link>}
              {admin && <Link href="/admin/activity">Activity</Link>}
              <Link href="/admin/guide">Rep guide</Link>
            </div>
          </MoreMenu>
          <Link href="/admin/candidates/new" className={styles.addLink}>
            + Add candidate
          </Link>
          <MoreMenu className={`${styles.more} ${styles.who}`}>
            <summary>
              {me.name.split(" ")[0]}
              {admin ? "" : " (rep)"}
            </summary>
            <div>
              <Link href="/admin/password">Change password</Link>
              <form action={adminLogout} className={styles.out}>
                <button type="submit">Sign out</button>
              </form>
            </div>
          </MoreMenu>
        </div>
      </nav>
      {children}
    </div>
  );
}
