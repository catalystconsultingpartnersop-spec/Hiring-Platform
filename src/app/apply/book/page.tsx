import { db } from "@/lib/db";
import { contactPhone, contactPhoneHref } from "@/lib/format";
import { readSignedToken } from "@/lib/session";
import { availableTimes } from "../actions";
import { ApplyFlow } from "../ApplyFlow";

export const dynamic = "force-dynamic";

// Linked from emails ("pick a new time"): goes straight to the time picker.
export default async function BookPage({ searchParams }: PageProps<"/apply/book">) {
  const sp = await searchParams;
  const token = typeof sp.c === "string" ? sp.c : "";
  const candidateId = readSignedToken(token, "cand_");
  let first = "";
  if (candidateId) {
    const { data } = await db().from("candidates").select("full_name").eq("id", candidateId).maybeSingle();
    first = data?.full_name?.split(" ")[0] ?? "";
  }
  const times = await availableTimes();
  return (
    <div className="wrap narrow apply-page">
      <div className="page-head">
        <h1>Pick a time to talk.</h1>
      </div>
      {candidateId ? (
        <ApplyFlow
          times={times}
          assessmentUrl={process.env.ASSESSMENT_URL || "https://www.workinggenius.com"}
          phone={contactPhone()}
          phoneHref={contactPhoneHref()}
          startToken={token}
          startFirst={first || "again"}
        />
      ) : (
        <p className="notice">
          This link has expired. Text or call us at <a href={`sms:${contactPhoneHref()}`}>{contactPhone()}</a> and
          we&rsquo;ll set up a time.
        </p>
      )}
    </div>
  );
}
