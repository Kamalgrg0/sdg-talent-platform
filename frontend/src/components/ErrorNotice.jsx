export function ErrorNotice({ title = "Something went wrong", message, onRetry }) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="alert alert--error">
          <span className="alert-icon" aria-hidden="true">
            !
          </span>
          <div>
            <strong>{title}</strong>
            {message ? <p>{message}</p> : null}
          </div>
        </div>
        {onRetry ? (
          <button className="btn btn--outline" type="button" onClick={onRetry}>
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}
