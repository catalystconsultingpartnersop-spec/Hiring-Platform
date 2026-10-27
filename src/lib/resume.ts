// Pulls the basics (name, email, phone, LinkedIn) out of a resume so staff
// don't have to type them. Best effort: anything not found is left blank.

export async function resumeText(buf: Buffer, type: string): Promise<string> {
  if (type === "application/pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : text;
  }
  if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return value;
  }
  return "";
}

const NOT_A_NAME = /resume|curriculum|vitae|cv\b|profile|summary|objective|experience|education|contact|phone|email|address|linkedin|page/i;

export function resumeBasics(text: string) {
  const email = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0]?.toLowerCase() ?? "";
  const phone =
    text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)?.[0]?.trim() ??
    text.match(/\+972[\s-]?\d{1,2}[\s-]?\d{3}[\s-]?\d{4}/)?.[0]?.trim() ??
    "";
  const li = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+/i)?.[0] ?? "";
  const linkedin = li ? (li.startsWith("http") ? li : `https://${li}`) : "";

  // The name is usually the first short line made only of words.
  const lines = text
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 8);
  const name =
    lines.find(
      (l) =>
        l.length <= 40 &&
        !NOT_A_NAME.test(l) &&
        /^[A-Za-zÀ-ÿ'’.-]+(?: [A-Za-zÀ-ÿ'’.-]+){1,3}$/.test(l),
    ) ?? "";
  const full_name = name
    .split(" ")
    .map((w) => (w === w.toUpperCase() && w.length > 1 ? w[0] + w.slice(1).toLowerCase() : w))
    .join(" ");

  return { full_name, email, phone, linkedin_url: linkedin };
}
