// Where a candidate's profile comes from, in order of importance (Heshy's order):
// 1. the rep's own take, 2. the call recording, 3. our notes from the call,
// 4. their Strengths Assessment, 5. their resume. The highest one we have leads;
// anything missing is skipped, so the writing never gets stuck.
export type Sources = { take?: string | null; call?: boolean; notes?: boolean; strengths?: boolean; resume?: boolean };

export function sourceOrder(s: Sources) {
  const take = (s.take ?? "").trim();
  const list = [
    take && `Our rep's own take on them (written by the rep who knows them): "${take}"`,
    s.call && "What they said on their recorded call with us",
    s.notes && "Our team's notes from talking with them",
    s.strengths && "Their Strengths Assessment result",
    s.resume && "Their resume",
  ].filter(Boolean) as string[];
  if (!list.length) return "";
  return `WHERE THIS PROFILE COMES FROM, in order of importance. Build mainly on the first one; the ones after it add proof and detail. When two of them disagree, the one higher on this list wins.
${list.map((x, i) => `${i + 1}. ${x}`).join("\n")}
- Keep the meaning and emphasis of the top source: what it stresses is what the profile stresses.
- Their past jobs are proof of what they can do, not necessarily what they want next. If a higher source says they want something new, don't steer them back to their old field.
${take ? "- Never quote the rep or say a rep said it. Write it as plain fact.\n" : ""}`;
}
