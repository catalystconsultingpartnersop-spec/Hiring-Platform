import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/session";
import { getTemplate } from "@/lib/templates";
import { TemplateFiller } from "./TemplateFiller";
import styles from "../../help.module.css";

export const dynamic = "force-dynamic";

export default async function TemplatePage({ params, searchParams }: PageProps<"/hiring-help/templates/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const t = getTemplate(slug);
  if (!t) notFound();
  const owner = await requireOwner(`/hiring-help/templates/${slug}`);

  // Candidates this owner has unlocked, to fill in names automatically.
  const { data } = await db()
    .from("unlocks")
    .select("candidate_id, candidates(full_name, role_category)")
    .eq("owner_id", owner.id)
    .not("confirmed_at", "is", null)
    .order("signed_at", { ascending: false });
  const mine = (data ?? []) as unknown as { candidate_id: string; candidates: { full_name: string; role_category: string | null } }[];
  // The hiring documents come with your first unlocked candidate.
  if (!mine.length) redirect("/hiring-help?locked=1#documents");
  const picked = mine.find((m) => m.candidate_id === sp.c) ?? (mine.length === 1 ? mine[0] : undefined);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const initial: Record<string, string> = {};
  for (const f of t.fields) {
    const v =
      f.prefill === "company" ? owner.company
      : f.prefill === "owner" ? owner.full_name
      : f.prefill === "ownerEmail" ? owner.email
      : f.prefill === "today" ? today
      : f.prefill === "candidate" ? picked?.candidates.full_name
      : f.prefill === "jobTitle" ? picked?.candidates.role_category
      : undefined;
    if (v) initial[f.key] = v;
  }

  return (
    <div className="wrap" style={{ paddingTop: 24, paddingBottom: 56 }}>
      <Link href="/hiring-help" className="small muted no-print">
        Hiring help
      </Link>
      <div className="no-print" style={{ margin: "10px 0 0" }}>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(28px,4vw,38px)", margin: 0 }}>{t.title}</h1>
        <p className="muted" style={{ margin: "6px 0 0", maxWidth: 680 }}>
          {t.blurb} {t.when}
        </p>
        {mine.length > 1 && (
          <p className="small" style={{ marginTop: 10 }}>
            Fill in for:{" "}
            {mine.map((m, i) => (
              <span key={m.candidate_id}>
                {i > 0 && " · "}
                <Link href={`/hiring-help/templates/${slug}?c=${m.candidate_id}`} style={m === picked ? { fontWeight: 700 } : undefined}>
                  {m.candidates.full_name}
                </Link>
              </span>
            ))}
          </p>
        )}
        {t.note && <p className={`notice notice-gold small ${styles.note}`}>{t.note}</p>}
      </div>
      <TemplateFiller key={picked?.candidate_id ?? "none"} title={t.title} body={t.body} fields={t.fields} initial={initial} />
    </div>
  );
}

