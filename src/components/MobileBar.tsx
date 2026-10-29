// The main action pinned to the bottom of the screen on phones, so it's
// always one tap away on long pages. Hidden on larger screens.
export function MobileBar({ label, sub, children }: { label?: string; sub?: string; children: React.ReactNode }) {
  return (
    <>
      <div className="mobile-bar-space" aria-hidden="true" />
      <div className="mobile-bar">
        {(label || sub) && (
          <div className="mobile-bar-text">
            {label && <strong>{label}</strong>}
            {sub && <span>{sub}</span>}
          </div>
        )}
        {children}
      </div>
    </>
  );
}
