export function ProfileCompleteness({ completeness }) {
  if (!completeness) return null;
  const percent = Number(completeness.percent) || 0;
  const missing = completeness.missing || [];

  return (
    <div className="card">
      <div className="card-body">
        <div className="row-between">
          <h2 className="dashboard-card-title">Profile completeness</h2>
          <span className="badge badge--blue">{percent}%</span>
        </div>
        <div className="progress mt-2" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <span className="progress__bar" style={{ width: `${percent}%` }} />
        </div>
        {missing.length > 0 ? (
          <p className="small text-muted mt-2">
            Still needed: {missing.join(", ")}.{" "}
            <a href="/dashboard/profile">Complete your profile</a>.
          </p>
        ) : (
          <p className="small text-muted mt-2">Your profile is complete. Keep it up to date.</p>
        )}
      </div>
    </div>
  );
}
