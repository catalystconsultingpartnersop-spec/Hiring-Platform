import { parseResult } from "@/lib/strengths";
import cs from "./cards.module.css";

// The six Strengths letters, small: natural strengths, can do well, wears them down.
export function SixLetters({ wg, style }: { wg: string | null | undefined; style?: React.CSSProperties }) {
  const l = parseResult(wg);
  if (l.length !== 6) return null;
  const s = l.join("");
  return (
    <span className={cs.six} style={{ verticalAlign: "middle", marginLeft: 8, ...style }} title="Strengths Assessment: natural strengths, can do well, wears them down">
      <b className={cs.good}>{s.slice(0, 2)}</b>
      <b className={cs.mid}>{s.slice(2, 4)}</b>
      <b className={cs.bad}>{s.slice(4)}</b>
    </span>
  );
}
