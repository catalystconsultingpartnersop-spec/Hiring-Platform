// The people behind the company: their photo when we have one, otherwise their initial.
const COLORS = ["#17213a", "#8a5a12", "#2f5d50", "#5b3f86"];

export function Faces({ people, size = 64 }: { people: { first: string; name: string; photo?: string | null }[]; size?: number }) {
  const ring = (i: number) => ({ width: size, height: size, borderRadius: "50%", border: "3px solid #fff", marginLeft: i ? -12 : 0, boxShadow: "0 4px 12px rgba(23,33,58,.15)" });
  return (
    <div style={{ display: "flex", flexShrink: 0 }}>
      {people.map((p, i) =>
        p.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={p.name} src={p.photo} alt={p.name} style={{ ...ring(i), objectFit: "cover" }} />
        ) : (
          <span key={p.name} title={p.name} style={{ ...ring(i), background: COLORS[i % COLORS.length], color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: size * 0.4 }}>
            {p.first.slice(0, 1)}
          </span>
        ),
      )}
    </div>
  );
}
