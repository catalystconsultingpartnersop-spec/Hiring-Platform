import { availableTimes, repChoices } from "./actions";
import { ApplyFlow } from "./ApplyFlow";
import { HOW_IT_WORKS, YOUR_PART } from "@/lib/promise";

export const dynamic = "force-dynamic";

export default async function ApplyPage() {
  const [times, reps] = await Promise.all([availableTimes(), repChoices()]);
  return (
    <div className="wrap narrow apply-page">
      <div className="page-head">
        <h1>Let&rsquo;s find work that fits you.</h1>
        <p>
          It doesn&rsquo;t cost you a thing. Tell us a little about yourself, then pick a time for a relaxed video call. We&rsquo;ll help you
          figure out where you&rsquo;d do your best work and introduce you to employers looking for someone like you.
        </p>
      </div>
      <ApplyFlow
        times={times}
        assessmentUrl={process.env.ASSESSMENT_URL || "https://www.workinggenius.com"}
        agreement={{ how: HOW_IT_WORKS, ask: YOUR_PART }}
        reps={reps.list}
        referred={reps.referred}
      />
    </div>
  );
}
