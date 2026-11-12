import type { Metadata } from "next";
import { meetTimes, MEET_MINUTES } from "@/lib/meetUs";
import { MeetFlow } from "./MeetFlow";
import s from "./meet.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Schedule a call", description: "Book a short call with the people behind The Candidate Collection." };

export default async function MeetPage() {
  const times = await meetTimes().catch(() => []);
  return (
    <div className={`wrap ${s.page}`}>
      <div className={s.head}>
        <div>
          <h1>Schedule a call</h1>
          <p>
            A {MEET_MINUTES}-minute conversation with our founders. Tell us about the role, and we&rsquo;ll tell you honestly whether we have the right person. No cost, no commitment.
          </p>
        </div>
      </div>
      <MeetFlow times={times.map((t) => t.start)} />
    </div>
  );
}
