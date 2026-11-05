// The rep's own take on a candidate ("Your first take" on their profile). When a rep
// writes one, it's the truth about the person: every profile the site writes is built
// around it, and everything else (resume, call, Strengths Assessment) only backs it up.
export function repTakeBlock(take: string | null | undefined) {
  const t = (take ?? "").trim();
  if (!t) return "";
  return `THE REP'S TAKE COMES FIRST. Our rep knows this person well. In the rep's words:
"${t}"
How to use it:
- This is who they are. Build the headline, the summary and most of the points (at least two out of every three) on what the rep says.
- Keep the rep's meaning and emphasis. What the rep stresses is what the page stresses.
- Everything else here (resume, call, Strengths Assessment) only backs the rep up with proof and small details. If anything disagrees with the rep, follow the rep.
- Don't add personality traits or strengths the rep didn't mention unless the resume or call clearly shows them. Never build points out of the Strengths Assessment alone.
- Their past jobs are proof of what they can do, not necessarily what they want next. If the rep says they want something new, don't steer them back to their old field.
- Never quote the rep or say a rep said it. Write it as plain fact.
`;
}

// How much weight the Strengths Assessment gets: full when there's no rep take, light when there is.
export function assessmentWeight(take: string | null | undefined) {
  return (take ?? "").trim()
    ? "background only: use it only where it agrees with the rep's take, and at most for one small touch"
    : "use it to shape the headline and summary";
}
