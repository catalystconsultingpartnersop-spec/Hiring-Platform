// AI suggestions for a profile's wording. Nothing is saved here: the rep sees the
// suggestion and decides whether to use it.

const MODELS = ["claude-sonnet-5-5", "claude-sonnet-4-5"];

export type Wording = { headline: string; summary: string; highlights: string };

async function askAI(prompt: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("The AI key isn't set up yet.");
  let last = "";
  for (const model of MODELS) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
    });
    if (r.ok) {
      const j = (await r.json()) as { content: { text?: string }[] };
      return j.content.map((x) => x.text ?? "").join("");
    }
    last = `${r.status}`;
    if (r.status !== 404 && r.status !== 400) break;
  }
  throw new Error(`The AI didn't answer (${last}). Try again in a minute.`);
}

export async function suggestWording(w: Wording, mode: "fix" | "polish", role: string): Promise<Wording> {
  const task =
    mode === "fix"
      ? `Some lines still have blanks in square brackets, like "[number]" or "[percent]", left over from a template. Rewrite ONLY the sentences or lines that contain a blank so they read naturally without it (for example "Grew sales by [percent]" becomes "Grew sales year over year"). Never make up a number or fact to fill a blank. Leave every other sentence and line exactly as it is.`
      : `Polish the wording: fix spelling, grammar, capitals and punctuation, make it read smoothly and confidently, and remove any "[blank]" placeholders by rewording around them. Keep the same meaning, facts and roughly the same length. Never add facts, numbers, employers, schools or names.`;
  const prompt = `You help reps at a hiring platform write anonymous candidate profiles that business owners read before deciding to meet someone.${role ? ` The candidate is looking for: ${role}.` : ""}

${task}

Profiles are anonymous: no names, employers, schools or exact titles. American English. Plain, warm, specific. Highlights are short lines, one per line, no bullet symbols.

Here is the current wording as JSON:
${JSON.stringify(w)}

Reply with only JSON in the same shape: {"headline": "...", "summary": "...", "highlights": "line one\\nline two"}. Keep a field empty if it is empty now.`;
  const raw = await askAI(prompt);
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  let out: Partial<Wording>;
  try {
    out = JSON.parse(json) as Partial<Wording>;
  } catch {
    throw new Error("The suggestion didn't come through right. Try again.");
  }
  const str = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);
  return {
    headline: w.headline ? str(out.headline, w.headline) : "",
    summary: w.summary ? str(out.summary, w.summary) : "",
    highlights: w.highlights ? str(out.highlights, w.highlights) : "",
  };
}
