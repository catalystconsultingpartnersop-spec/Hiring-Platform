import { parseResult } from "@/lib/strengths";
import cs from "./cards.module.css";

// The six Strengths letters, small: natural strengths (1-2), close behind (3), doable in doses (4), wears them down (5-6).
export function SixLetters({ wg, style }: { wg: string | null | undefined; style?: React.CSSProperties }) {
  const l = parseResult(wg);
  if (l.length !== 6) return null;
  const s = l.join("");
  return (
    <span className={cs.six} style={{ verticalAlign: "middle", marginLeft: 8, ...style }} title="Strengths Assessment: natural strengths · close behind · doable, in doses · wears them down">
      <b className={cs.good}>{s.slice(0, 2)}</b>
      <b className={cs.close}>{s.slice(2, 3)}</b>
      <b className={cs.mid}>{s.slice(3, 4)}</b>
      <b className={cs.bad}>{s.slice(4)}</b>
    </span>
  );
}
