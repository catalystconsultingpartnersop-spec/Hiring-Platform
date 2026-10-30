import type { Metadata } from "next";
import { brandName } from "@/lib/format";
import { Assessment } from "./Assessment";
import s from "./strengths.module.css";

export const metadata: Metadata = {
  title: `Discover your natural strengths | ${brandName()}`,
  description: "A short assessment that shows the kind of work that gives you energy, and where you could shine.",
  robots: { index: false, follow: false },
};

export default function StrengthsPage() {
  return (
    <>
      <section className={s.hero}>
        <div className="wrap">
          <p className={s.label}>Strengths assessment</p>
          <h1>Discover what you&rsquo;re naturally great at.</h1>
          <p className={s.lead}>
            A few minutes of honest answers, and you&rsquo;ll see the kind of work that gives you energy, what wears you down,
            and where you could shine.
          </p>
        </div>
      </section>
      <div className={`wrap ${s.main}`}>
        <Assessment />
      </div>
    </>
  );
}
