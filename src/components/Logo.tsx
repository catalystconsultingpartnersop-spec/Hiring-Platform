import { brandName } from "@/lib/format";


export const TAGLINE = "Browse talent with ease";

// The one logo used everywhere: header, footer, agreements, receipts.
// The mark: a "C" that holds a person, the collection built around the candidate.
export function Logo({ tagline = false, size = "md" }: { tagline?: boolean; size?: "md" | "lg" }) {
  const name = brandName();
  const i = name.lastIndexOf(" ");
  return (
    <span className={`logo logo-${size}`}>
      <svg className="logo-mark" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M71 31A27 27 0 1 0 71 69" fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round" />
        <circle cx="55" cy="50" r="10" fill="#f2b300" />
      </svg>
      <span className="logo-text">
        <span className="logo-name">
          {i > 0 ? (
            <>
              {name.slice(0, i)} <span className="brand-accent">{name.slice(i + 1)}</span>
            </>
          ) : (
            name
          )}
        </span>
        {tagline && <span className="logo-tag">{TAGLINE}</span>}
      </span>
    </span>
  );
}

// Letterhead for printable documents (agreements, receipts).
export function Letterhead({ right }: { right?: React.ReactNode }) {
  return (
    <div className="letterhead">
      <Logo tagline size="lg" />
      {right && <div className="letterhead-right">{right}</div>}
    </div>
  );
}
