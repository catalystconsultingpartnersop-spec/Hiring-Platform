import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap narrow" style={{ textAlign: "center", padding: "clamp(64px, 12vw, 140px) 20px" }}>
      <p style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#a87a00", margin: "0 0 14px" }}>Page not found</p>
      <h1 style={{ fontSize: "clamp(34px, 5vw, 56px)", letterSpacing: "-0.035em", lineHeight: 1.05, margin: 0 }}>That page isn&rsquo;t here.</h1>
      <p className="muted" style={{ fontSize: 19, margin: "16px auto 28px", maxWidth: "34ch" }}>
        The link may be old, or the candidate may have been hired. Here&rsquo;s where to go next.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <Link className="btn btn-gold" href="/">
          Go to the homepage
        </Link>
        <Link className="btn btn-ghost" href="/candidates">
          Browse candidates
        </Link>
      </div>
    </div>
  );
}
