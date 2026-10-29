import type { Metadata } from "next";
import { db } from "@/lib/db";
import { brandName, refCode } from "@/lib/format";

import { currentCandidateId, currentOwner } from "@/lib/session";
import { ContactForm } from "./ContactForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Contact us | ${brandName()}` };

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const sp = await searchParams;
  const [owner, candId] = await Promise.all([currentOwner().catch(() => null), currentCandidateId().catch(() => null)]);
  const cid = typeof sp.c === "string" && /^[0-9a-f-]{36}$/i.test(sp.c) ? sp.c : null;
  let about: string | null = null;
  if (cid) {
    const { data } = await db().from("candidates").select("id, headline").eq("id", cid).maybeSingle();
    if (data) about = `Candidate ${refCode(data.id)}${data.headline ? `: ${data.headline}` : ""}`;
  }
  let me: { full_name: string; email: string } | null = null;
  if (candId) {
    const { data } = await db().from("candidates").select("full_name, email").eq("id", candId).maybeSingle();
    me = data;
  }
  const kindParam = typeof sp.kind === "string" ? sp.kind : "";
  const start = (["hiring", "work", "other"].includes(kindParam) ? kindParam : owner || cid ? "hiring" : me ? "work" : "hiring") as "hiring" | "work" | "other";
  return (
    <div className="wrap narrow" style={{ maxWidth: 680, paddingBottom: 56 }}>
      <div className="page-head">
        <h1>Contact us</h1>
        <p>
          {start === "work"
            ? "Questions about your profile, an interview or an offer? Send a note and your rep will get back to you."
            : "Send us a note, or leave a number and we'll call you back."}
        </p>
      </div>
      <ContactForm
        start={start}
        about={about}
        candidateId={cid}
        name={owner?.full_name ?? me?.full_name ?? ""}
        email={owner?.email ?? me?.email ?? ""}
      />
    </div>
  );
}
