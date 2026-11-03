// Small, safe wording fixes applied whenever a profile is saved. They only touch
// spacing, capitals and end punctuation, never the words themselves.

const ABBREV = /\b(e\.g|i\.e|etc|vs|approx|incl|dept|mr|mrs|ms|dr|st|jr|sr|no)\.$/i;

function tidyLine(line: string): string {
  let s = line.replace(/[ \t ]+/g, " ").trim();
  s = s.replace(/\s+([,.;:!?])/g, "$1"); // "word ," → "word,"
  s = s.replace(/([,;:])(?=[A-Za-z])/g, "$1 "); // "a,b" → "a, b" (letters only, so 1,000 stays)
  s = s.replace(/(?<!\.)\.\.(?!\.)/g, "."); // ".." → "." but keep "..."
  return s;
}

function capFirst(s: string): string {
  return s.replace(/^([^A-Za-z0-9]*)([a-z])/, (_, pre: string, ch: string) => pre + ch.toUpperCase());
}

// Capital at the start of each sentence (skipping abbreviations like "e.g.").
function capSentences(s: string): string {
  let out = capFirst(s);
  out = out.replace(/([.!?])(\s+)([a-z])/g, (m, p: string, sp: string, ch: string, off: number) => {
    const before = out.slice(0, off + 1);
    return ABBREV.test(before) || before.endsWith("...") ? m : p + sp + ch.toUpperCase();
  });
  return out;
}

// Headline: spacing and a capital first letter. No period.
export function tidyHeadline(s: string): string {
  return capFirst(tidyLine(s)).replace(/[.]$/, "");
}

// Paragraph text (summary, full profile): spacing, sentence capitals, a final period.
export function tidyParagraphs(s: string): string {
  const paras = s
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) =>
      p
        .split("\n")
        .map(tidyLine)
        .filter(Boolean)
        .join("\n"),
    )
    .filter(Boolean)
    .map((p) => {
      const t = capSentences(p);
      return /[A-Za-z0-9)\]]$/.test(t) ? `${t}.` : t;
    });
  return paras.join("\n\n");
}

// One highlight: spacing and a capital first letter. The period is left as the rep wrote it.
export function tidyHighlight(s: string): string {
  return capFirst(tidyLine(s));
}

// Blanks left in from the idea templates, like "[number]" or "[percent]".
const BLANK = /\[[^\]\n]{1,40}\]/g;
export function findBlanks(s: string | null | undefined): string[] {
  return [...new Set((s ?? "").match(BLANK) ?? [])];
}
