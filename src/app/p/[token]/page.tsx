import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { packetCandidate } from "@/lib/packetLink";

export const metadata: Metadata = { title: "Resume and summary", robots: { index: false } };
export const dynamic = "force-dynamic";

// Opened from a calendar invite: the candidate's resume and one-page summary.
export default async function PacketPage({ params }: PageProps<"/p/[token]">) {
  const { token } = await params;
  const id = packetCandidate(token);
  if (!id) notFound();
  const { data: c } = await db().from("candidates").select("full_name, headline, resume_path, application").eq("id", id).maybeSingle();
  if (!c) notFound();
  return (
    <div className="wrap" style={{ maxWidth: 560, paddingTop: 40, paddingBottom: 60 }}>
      <p className="small muted" style={{ margin: 0 }}>Shared with you for your meeting</p>
      <h1 style={{ margin: "6px 0 4px" }}>{c.full_name}</h1>
      {c.headline && <p style={{ margin: "0 0 22px" }}>{c.headline}</p>}
      <div style={{ display: "grid", gap: 10 }}>
        <a className="btn btn-gold" href={`/p/${token}/file?f=summary`} target="_blank" rel="noopener">
          One-page summary
        </a>
        {(c.resume_path || (c.application as Record<string, string> | null)?.owner_resume === "clean") && (
          <a className="btn" href={`/p/${token}/file?f=resume`} target="_blank" rel="noopener">
            Resume
          </a>
        )}
      </div>
      <p className="small muted" style={{ marginTop: 18 }}>Please keep these private. They&rsquo;re shared only for this hiring conversation.</p>
    </div>
  );
}
