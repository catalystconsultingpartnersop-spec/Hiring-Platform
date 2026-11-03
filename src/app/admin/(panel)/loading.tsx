// Shows the moment a back-office link is clicked, so a click always feels answered.
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" style={{ paddingTop: 28 }}>
      <span className="sr-only">Loading…</span>
      <div className="admin-skel" style={{ width: "38%", height: 44, marginBottom: 18 }} />
      <div className="admin-skel" style={{ width: "60%", height: 16, marginBottom: 28 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="admin-skel" style={{ height: 150, borderRadius: 16 }} />
        ))}
      </div>
    </div>
  );
}
