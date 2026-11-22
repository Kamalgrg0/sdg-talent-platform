import { Link } from "react-router-dom";

export function PageHeader({ eyebrow, title, lead, actions, listing = false, children }) {
  return (
    <section className={`page-header${listing ? " page-header--listing" : ""}`}>
      <div className="container page-header__inner">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {lead ? <p className="lead">{lead}</p> : null}
        {children}
        {actions ? <div className="page-header__actions">{actions}</div> : null}
      </div>
    </section>
  );
}

export function SectionHead({ title, text, link, linkLabel, center = false }) {
  return (
    <div className={`section-head${center ? " section-head--center" : ""}`}>
      <div className="section-head__text">
        <h2>{title}</h2>
        {text ? <p className="text-muted">{text}</p> : null}
      </div>
      {link ? (
        <Link className="section-link" to={link}>
          {linkLabel || "View all"} <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  );
}
