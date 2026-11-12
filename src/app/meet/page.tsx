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
            A short video call with our team. Tell us about the role and hear what we have to offer. Pick how long works for you.
          </p>
        </div>
      </div>
      <MeetFlow times={times.map((t) => t.start)} />
    </div>
  );
}
