import { brandName } from "@/lib/format";

export const TAGLINE = "Browse talent with ease";

// The one logo used everywhere: header, footer, agreements, receipts.
export function Logo({ tagline = false, size = "md" }: { tagline?: boolean; size?: "md" | "lg" }) {
  const name = brandName();
  const i = name.lastIndexOf(" ");
  return (
    <span className={`logo logo-${size}`}>
      <span className="logo-mark" aria-hidden="true" />
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
