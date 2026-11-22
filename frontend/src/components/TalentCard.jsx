import { Link } from "react-router-dom";
import { availabilityLabel, truncate } from "../lib/format";
import { Avatar } from "./Avatar";

export function TalentCard({ profile }) {
  const role = profile.user?.role || profile.role;
  const skills = profile.skills || [];
  const sdgs = profile.sdgs || [];

  return (
    <article className="talent-card">
      <div className="talent-card__head">
        <Avatar name={profile.name} size="lg" />
        <div className="talent-card__identity">
          <h3 className="talent-card__name">
            <Link to={`/talent/${profile.id}`}>{profile.name}</Link>
          </h3>
          <p className="talent-card__title">{profile.professional_title}</p>
        </div>
      </div>

      <p className="talent-card__meta">
        <span className={`badge ${role === "freelancer" ? "badge--green" : "badge--blue"}`}>
          {role === "freelancer" ? "Freelancer" : "Job seeker"}
        </span>
        <span>{profile.location}</span>
        <span>{availabilityLabel(profile.availability)}</span>
      </p>

      {profile.bio ? <p className="talent-card__bio">{truncate(profile.bio, 150)}</p> : null}

      {skills.length > 0 ? (
        <div className="tag-list">
          {skills.slice(0, 4).map((skill) => (
            <span className="tag" key={skill.skill_id}>
              {skill.name}
            </span>
          ))}
          {skills.length > 4 ? <span className="tag tag--more">+{skills.length - 4}</span> : null}
        </div>
      ) : null}

      {sdgs.length > 0 ? (
        <div className="talent-card__sdgs">
          {sdgs.slice(0, 3).map((sdg) => (
            <span className="sdg-chip" style={{ "--sdg-color": sdg.color_hex }} key={sdg.id}>
              <span className="sdg-dot" aria-hidden="true" />
              {sdg.code}
            </span>
          ))}
        </div>
      ) : null}

      <div className="talent-card__foot">
        <Link className="link-arrow" to={`/talent/${profile.id}`}>
          View profile
        </Link>
      </div>
    </article>
  );
}
