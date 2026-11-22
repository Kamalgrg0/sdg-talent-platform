export function Loading({ label = "Loading…", large = false }) {
  return (
    <div className="app-loading" role="status" aria-live="polite">
      <span className={`spinner${large ? " spinner--lg" : ""}`} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function InlineLoading({ label = "Working…" }) {
  return (
    <span className="inline-spinner" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {label}
    </span>
  );
}
