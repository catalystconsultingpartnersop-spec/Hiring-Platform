import type { Metadata } from "next";
import { leaders, meetTimes, MEET_MINUTES } from "@/lib/meetUs";
import { MeetFlow } from "./MeetFlow";
import s from "./meet.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Meet us", description: "Book a short call with the people behind The Candidate Collection." };

export default async function MeetPage({ searchParams }: PageProps<"/meet">) {
  const sp = await searchParams;
  const pre = (k: string) => (typeof sp[k] === "string" ? String(sp[k]).slice(0, 200) : "");
  const [team, times] = await Promise.all([leaders(), meetTimes().catch(() => [])]);
  const names = team.map((l) => l.first).join(" and ") || "our team";
  return (
    <div className={`wrap ${s.page}`}>
      <div className={s.head}>
        <div>
          <h1>Meet us</h1>
          <p>
            A {MEET_MINUTES}-minute call with {names}. Tell us about the job, and we&rsquo;ll tell you honestly whether we have someone for it. Free, and no commitment.
          </p>
        </div>
      </div>
      <MeetFlow times={times.map((t) => t.start)} names={names} role={pre("role")} town={pre("town")} />
    </div>
  );
}
