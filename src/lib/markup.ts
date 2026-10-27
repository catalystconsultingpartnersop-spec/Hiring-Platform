// Renders the light markup used by templates and articles into HTML.
// Everything is escaped; only our own tags are produced.

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export type FillOptions = {
  values?: Record<string, string>;
  labels?: Record<string, string>;
  blanks?: "highlight" | "line"; // on screen vs. printed/downloaded
};

function fill(line: string, o: FillOptions) {
  return esc(line).replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
    const v = o.values?.[k]?.trim();
    if (v) return `<span class="filled">${esc(v)}</span>`;
    if (o.blanks === "line") return "________________";
    return `<span class="blank">${esc(o.labels?.[k] ?? k)}</span>`;
  });
}

export function markupToHtml(text: string, o: FillOptions = {}) {
  const out: string[] = [];
  let list: string[] = [];
  let para: string[] = [];
  const flushList = () => {
    if (list.length) out.push(`<ul>${list.map((l) => `<li>${l}</li>`).join("")}</ul>`);
    list = [];
  };
  const flushPara = () => {
    if (para.length) out.push(`<p>${para.join("<br>")}</p>`);
    para = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushList();
      flushPara();
      continue;
    }
    if (line.startsWith("# ")) {
      flushList();
      flushPara();
      out.push(`<h1>${fill(line.slice(2), o)}</h1>`);
    } else if (line.startsWith("## ")) {
      flushList();
      flushPara();
      out.push(`<h2>${fill(line.slice(3), o)}</h2>`);
    } else if (line.startsWith("- ")) {
      flushPara();
      list.push(fill(line.slice(2), o));
    } else if (line.startsWith("[ ] ")) {
      flushList();
      flushPara();
      out.push(`<p class="tick"><span class="box"></span>${fill(line.slice(4), o)}</p>`);
    } else if (line.startsWith("SIGN:")) {
      flushList();
      flushPara();
      out.push(`<div class="sign"><div class="sign-line"></div><div>${fill(line.slice(5).trim(), o)}</div></div>`);
    } else {
      flushList();
      para.push(fill(line, o));
    }
  }
  flushList();
  flushPara();
  return out.join("\n");
}

// Styles for a downloaded Word file or a printed page.
export const DOC_CSS = `body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#17213a;line-height:1.5}
h1{font-size:18pt;margin:0 0 10pt}h2{font-size:12.5pt;margin:16pt 0 6pt}
ul{margin:4pt 0 8pt 18pt;padding:0}li{margin:2pt 0}p{margin:6pt 0}
.tick .box{display:inline-block;width:10pt;height:10pt;border:1px solid #17213a;margin-right:8pt;vertical-align:-1pt}
.sign{margin-top:28pt;width:60%}.sign-line{border-bottom:1px solid #17213a;height:22pt;margin-bottom:4pt}`;
