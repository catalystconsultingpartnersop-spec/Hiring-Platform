import type { Metadata } from "next";
import { Assessment } from "./Assessment";
import s from "./strengths.module.css";

export const metadata: Metadata = {
  title: "Discover how you\u2019re wired",
  description: "Everyone has natural strengths. In about 8 minutes, see yours.",
  robots: { index: false, follow: false },
};

export default async function StrengthsPage({ searchParams }: PageProps<"/strengths">) {
  const t = (await searchParams).t;
  return (
    <div className={`wrap ${s.main}`}>
      <Assessment token={typeof t === "string" ? t : null} />
    </div>
  );
}
