import { Link } from "react-router-dom";
import {
  daysUntil,
  deadlineLabel,
  formatDate,
  formatMoney,
  isDeadlineSoon,
  truncate,
} from "../lib/format";

export function FreelanceCard({ project }) {
  const days = daysUntil(project.deadline);
  const skills = project.skills || [];

  return (
    <article className="opportunity-card freelance-card">
      <div className="card-top">
        <span className="budget-pill">{formatMoney(project.budget_npr)}</span>
        <span className={`card-deadline${isDeadlineSoon(project.deadline) ? " card-deadline--soon" : ""}`}>
          <span className="deadline-note">{deadlineLabel(project.deadline)}</span>
        </span>
      </div>

      <h3 className="card-title">
        <Link to={`/freelance/${project.id}`}>{project.title}</Link>
      </h3>

      <p className="card-meta">
        <span>Client: {project.organization?.name || project.client?.name || "Independent client"}</span>
        <span>{project.duration}</span>
        {days !== null && days >= 0 ? <span>{days} days left</span> : null}
      </p>

      <p className="card-summary">{truncate(project.description, 150)}</p>

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
        <span className="small text-muted">Posted {formatDate(project.created_at)}</span>
        <Link className="link-arrow" to={`/freelance/${project.id}`}>
          View project
        </Link>
      </div>
    </article>
  );
}
