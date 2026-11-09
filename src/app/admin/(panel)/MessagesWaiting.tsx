import Link from "next/link";
import { listThreads } from "@/lib/ownerMessages";

// On the dashboard: owners waiting for an answer.
export async function MessagesWaiting({ staffId }: { staffId: string | null }) {
  const rows = (await listThreads(staffId).catch(() => [])).filter((t) => t.waiting);
  if (!rows.length) return null;
  return (
    <p className="notice notice-gold" style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <span>
        💬 <strong>{rows.length === 1 ? `${rows[0].name} is` : `${rows.length} owners are`} waiting for an answer</strong> about{" "}
        {rows.length === 1 ? `the ${rows[0].role ?? "candidate"}` : staffId ? "your candidates" : "our candidates"}.
      </span>
      <Link className="btn btn-small" href={rows.length === 1 ? `/admin/messages/${rows[0].id}` : "/admin/messages"}>
        Answer
      </Link>
    </p>
  );
}
