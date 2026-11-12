import type { Metadata } from "next";
import { meetTimes } from "@/lib/meetUs";
import { MeetFlow } from "./MeetFlow";
import s from "./meet.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Meet the team", description: "Book a short call with the people behind The Candidate Collection." };

export default async function MeetPage() {
  const times = await meetTimes().catch(() => []);
  return (
    <div className={`wrap ${s.page}`}>
      <div className={s.head}>
        <div>
          <h1>Meet the team</h1>
          <p>
            A short video call with the people who met the candidates. Tell us about your position, and we&rsquo;ll tell you who might fit.
            Pick how long works for you.
          </p>
        </div>
      </div>
      <MeetFlow times={times.map((t) => t.start)} />
    </div>
  );
}
