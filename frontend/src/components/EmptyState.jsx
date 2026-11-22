export function EmptyState({ title, text, action, compact = false, icon = "◇" }) {
  return (
    <div className={`empty-state${compact ? " empty-state--compact" : ""}`}>
      <span className="empty-state__icon" aria-hidden="true">
        {icon}
      </span>
      <h3>{title}</h3>
      {text ? <p>{text}</p> : null}
      {action}
    </div>
  );
}
