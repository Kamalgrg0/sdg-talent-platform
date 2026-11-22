import { Link } from "react-router-dom";
import { deadlineLabel, isDeadlineSoon, truncate } from "../lib/format";

export function OpportunityCard({ opportunity }) {
  const org = opportunity.organization || {};
  const skills = opportunity.skills || [];
  const sdg = opportunity.sdg;

  return (
    <article className="opportunity-card">
      <div className="card-top">
        <span className="badge badge--blue">{opportunity.type_label || opportunity.type}</span>
        <span className={`card-deadline${isDeadlineSoon(opportunity.deadline) ? " card-deadline--soon" : ""}`}>
          <span className="deadline-note">{deadlineLabel(opportunity.deadline)}</span>
        </span>
      </div>

      <h3 className="card-title">
        <Link to={`/opportunities/${opportunity.id}`}>{opportunity.title}</Link>
      </h3>

      <p className="card-org">
        {org.name || "Independent organization"}
        {org.is_verified ? <span className="verified">Verified</span> : null}
      </p>

      <p className="card-meta">
        <span>{opportunity.is_remote ? "Remote" : opportunity.location}</span>
        {opportunity.category ? <span>{opportunity.category}</span> : null}
      </p>

      <p className="card-summary">{opportunity.summary || truncate(opportunity.description, 150)}</p>

      {skills.length > 0 ? (
        <div className="tag-list">
          {skills.slice(0, 3).map((skill) => (
            <span className="tag" key={skill.id}>
              {skill.name}
            </span>
          ))}
          {skills.length > 3 ? <span className="tag tag--more">+{skills.length - 3}</span> : null}
        </div>
      ) : null}

      <div className="card-footer">
        {sdg ? (
          <span className="sdg-chip" style={{ "--sdg-color": sdg.color_hex }}>
            <span className="sdg-dot" aria-hidden="true" />
            {sdg.code}
          </span>
        ) : (
          <span />
        )}
        <Link className="link-arrow" to={`/opportunities/${opportunity.id}`}>
          View details
        </Link>
      </div>
    </article>
  );
}
