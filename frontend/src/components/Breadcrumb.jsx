import { Link } from "react-router-dom";

export function Breadcrumb({ items }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`}>
            {item.to && !last ? <Link to={item.to}>{item.label}</Link> : null}
            {!item.to || last ? (
              <span aria-current={last ? "page" : undefined}>{item.label}</span>
            ) : null}
            {!last ? <span aria-hidden="true"> / </span> : null}
          </span>
        );
      })}
    </nav>
  );
}

export function DetailFacts({ facts }) {
  return (
    <ul className="detail-facts">
      {facts
        .filter((fact) => fact && fact.value !== undefined && fact.value !== null && fact.value !== "")
        .map((fact) => (
          <li key={fact.label}>
            <span className="detail-fact-label">{fact.label}</span>
            <span className="detail-fact-value">{fact.value}</span>
          </li>
        ))}
    </ul>
  );
}

export function InlineBadge({ tone = "slate", children }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
