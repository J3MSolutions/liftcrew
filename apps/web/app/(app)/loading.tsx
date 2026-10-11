export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="skeleton" style={{ height: 34, width: 220, marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 16, width: '60%', maxWidth: 480, marginBottom: 28 }} />
      <div className="list">
        <div className="skeleton" style={{ height: 180 }} />
        <div className="skeleton" style={{ height: 180 }} />
      </div>
    </div>
  );
}
