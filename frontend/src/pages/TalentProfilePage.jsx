import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { Breadcrumb } from "../components/Breadcrumb";
import { ErrorNotice } from "../components/ErrorNotice";
import { Loading } from "../components/Loading";
import { MessageButton } from "../components/MessageButton";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import { availabilityLabel, fieldError } from "../lib/format";
import { useApi } from "../lib/useApi";

const LEVEL_TONES = {
  beginner: "badge--slate",
  intermediate: "badge--blue",
  advanced: "badge--green",
  expert: "badge--amber",
};

export default function TalentProfilePage() {
  const { id } = useParams();
  const { user, isEmployerSide, isAuthenticated } = useAuth();
  const toast = useToast();
  const { data: profile, loading, error, reload } = useApi(`/api/auth/talent/${id}/`);
  const inviteTargets = useApi(isEmployerSide ? "/api/opportunities/?scope=mine&per_page=50" : null);
  const projectTargets = useApi(isEmployerSide ? "/api/freelance/?scope=mine&per_page=50" : null);

  const [target, setTarget] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState(null);
  const [formMessage, setFormMessage] = useState("");
  const [sending, setSending] = useState(false);

  const skillsByCategory = useMemo(() => {
    const groups = new Map();
    (profile?.skills || []).forEach((skill) => {
      const key = skill.category || "Other skills";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(skill);
    });
    return [...groups.entries()];
  }, [profile]);

  if (loading) return <Loading label="Loading profile…" large />;
  if (error) {
    return (
      <div className="container section">
        <ErrorNotice
          title="This profile is not available"
          message="The profile may be private, suspended, or removed."
          onRetry={() => reload()}
        />
      </div>
    );
  }
  if (!profile) return null;

  const isOwner = Boolean(user && profile.user?.id === user.id);
  const canInvite = Boolean(isEmployerSide && user && !isOwner);
  const skillTone = (level) => LEVEL_TONES[level] || "badge--slate";

  async function handleInvite(event) {
    event.preventDefault();
    setSending(true);
    setFormMessage("");
    setFieldErrors(null);
    const payload = {
      talent_id: profile.user?.id,
      message: message.trim(),
    };
    if (target.startsWith("opportunity:")) payload.opportunity_id = Number(target.split(":")[1]);
    if (target.startsWith("project:")) payload.freelance_project_id = Number(target.split(":")[1]);
    try {
      await api.post("/api/opportunities/invitations/", payload);
      toast.success("Invitation sent. You will see the reply in your dashboard.");
      setMessage("");
      setTarget("");
    } catch (err) {
      setFieldErrors(err.errors);
      setFormMessage(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <section className="profile-hero">
        <div className="container">
          <Breadcrumb
            items={[{ label: "Talent directory", to: "/talent" }, { label: profile.name }]}
          />

          {isOwner && !profile.is_public ? (
            <div className="notice notice--warning private-preview">
              <p>
                <strong>Private preview.</strong> This profile is hidden from the talent directory.
                Only you can see this page until you turn visibility back on.
              </p>
            </div>
          ) : null}

          <div className="profile-hero__main">
            <Avatar name={profile.name} size="xl" />

            <div className="profile-hero__identity">
              <div className="profile-hero__badges">
                <span className={`badge ${profile.user?.role === "freelancer" ? "badge--green" : "badge--blue"}`}>
                  {profile.user?.role === "freelancer" ? "Freelancer" : "Job seeker"}
                </span>
                <span className={`badge ${profile.is_public ? "badge--green" : "badge--slate"}`}>
                  {profile.is_public ? "Public profile" : "Hidden from directory"}
                </span>
              </div>

              <h1>{profile.name}</h1>
              <p className="profile-hero__title">{profile.professional_title}</p>

              <ul className="profile-hero__facts">
                <li>
                  <span className="detail-fact-label">Location</span>
                  <span className="detail-fact-value">{profile.location || "Not set"}</span>
                </li>
                <li>
                  <span className="detail-fact-label">Availability</span>
                  <span className="detail-fact-value">{availabilityLabel(profile.availability)}</span>
                </li>
                <li>
                  <span className="detail-fact-label">Member since</span>
                  <span className="detail-fact-value">
                    {profile.member_since
                      ? new Date(`${profile.member_since}T00:00:00`).toLocaleDateString("en-GB", {
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </span>
                </li>
              </ul>
            </div>

            {isOwner ? (
              <div className="profile-hero__owner-actions">
                <Link className="btn btn--primary" to="/dashboard/profile">
                  Edit profile
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container profile-layout">
          <article className="profile-main">
            <div className="detail-block">
              <h2>About</h2>
              <div className="prose">{profile.bio || "No biography has been added yet."}</div>
            </div>

            {profile.experience ? (
              <div className="detail-block">
                <h2>Experience</h2>
                <div className="prose">{profile.experience}</div>
              </div>
            ) : null}

            {profile.education ? (
              <div className="detail-block">
                <h2>Education</h2>
                <div className="prose">{profile.education}</div>
              </div>
            ) : null}

            <div className="detail-block">
              <h2>Skills</h2>
              {skillsByCategory.length === 0 ? (
                <p className="text-muted">No skills have been added to this profile yet.</p>
              ) : (
                <div className="profile-skills">
                  {skillsByCategory.map(([category, skills]) => (
                    <div className="profile-skill-group" key={category}>
                      <h3>{category}</h3>
                      <ul className="profile-skill-list">
                        {skills.map((skill) => (
                          <li key={skill.skill_id}>
                            <span>{skill.name}</span>
                            <span className={`badge ${skillTone(skill.level)}`}>{skill.level}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="detail-block">
              <h2>SDG interests</h2>
              {(profile.sdgs || []).length === 0 ? (
                <p className="text-muted">No Sustainable Development Goals have been selected yet.</p>
              ) : (
                <div className="sdg-interest-list">
                  {profile.sdgs.map((sdg) => (
                    <Link
                      className="sdg-interest"
                      to={`/talent?sdg=${sdg.id}`}
                      key={sdg.id}
                      style={{ "--sdg-color": sdg.color_hex }}
                    >
                      <span className="sdg-dot" aria-hidden="true" />
                      <span>
                        <strong>{sdg.code}</strong> {sdg.name}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {canInvite ? (
              <div className="detail-block" id="invite">
                <h2>Invite {profile.name}</h2>
                <p>
                  Send a private invitation through TalentBridge. They receive it in their dashboard and
                  notification inbox. Your private contact details are never shown.
                </p>

                {formMessage ? (
                  <div className="alert alert--error">
                    <span className="alert-icon" aria-hidden="true">
                      !
                    </span>
                    <p>{formMessage}</p>
                  </div>
                ) : null}

                <form className="apply-form" onSubmit={handleInvite} noValidate>
                  <div className="form-field">
                    <label className="form-label" htmlFor="invite-target">
                      Related opportunity or project
                    </label>
                    <select
                      className="select"
                      id="invite-target"
                      value={target}
                      onChange={(event) => setTarget(event.target.value)}
                    >
                      <option value="">General message — not tied to a post</option>
                      {(inviteTargets.data?.results || []).length > 0 ? (
                        <optgroup label="Your open opportunities">
                          {inviteTargets.data.results.map((opportunity) => (
                            <option value={`opportunity:${opportunity.id}`} key={`opportunity-${opportunity.id}`}>
                              {opportunity.title}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                      {(projectTargets.data?.results || []).length > 0 ? (
                        <optgroup label="Your freelance projects">
                          {projectTargets.data.results.map((project) => (
                            <option value={`project:${project.id}`} key={`project-${project.id}`}>
                              {project.title}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                    </select>
                    <p className="help-text">Optional. Only your own posts are listed.</p>
                  </div>

                  <div className="form-field">
                    <label className="form-label" htmlFor="invite-message">
                      Message <span className="required">*</span>
                    </label>
                    <textarea
                      className={`textarea${fieldError(fieldErrors, "message") ? " is-invalid" : ""}`}
                      id="invite-message"
                      rows={5}
                      maxLength={2000}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      required
                    />
                    <p className="help-text">
                      At least 10 characters. Explain the role or project and why their profile fits.
                      Do not include phone numbers or private addresses.
                    </p>
                    {fieldError(fieldErrors, "message") ? (
                      <p className="field-error">{fieldError(fieldErrors, "message")}</p>
                    ) : null}
                  </div>

                  <div className="apply-actions">
                    <button className="btn btn--primary btn--lg" type="submit" disabled={sending}>
                      {sending ? "Sending…" : "Send invitation"}
                    </button>
                    <Link className="btn btn--ghost" to="/talent">
                      Keep browsing
                    </Link>
                  </div>
                </form>

                <p className="small text-muted">
                  An invitation is a message, not a job offer or contract. Payment and contracts are
                  arranged directly with the client or employer.
                </p>
              </div>
            ) : null}
          </article>

          <aside className="profile-side">
            <div className="card">
              <div className="card-body">
                <h2 className="side-heading">Contact</h2>
                <p className="small text-muted">
                  TalentBridge keeps private contact details private. Employers can send an invitation
                  through the platform.
                </p>
                {isOwner ? (
                  <Link className="btn btn--outline btn--block" to="/dashboard/profile">
                    Update your profile
                  </Link>
                ) : canInvite ? (
                  <>
                    <a className="btn btn--primary btn--block" href="#invite">
                      Send an invitation
                    </a>
                    <MessageButton
                      userId={profile.user?.id}
                      subject="About your profile"
                      label="Send a message"
                      className="btn btn--outline btn--block"
                    />
                  </>
                ) : !isAuthenticated ? (
                  <Link className="btn btn--primary btn--block" to="/login">
                    Log in as an employer to invite
                  </Link>
                ) : (
                  <p className="small text-muted">
                    Invitations are sent from employer and organization accounts.
                  </p>
                )}
              </div>
            </div>

            {profile.portfolio_url || profile.linkedin_url ? (
              <div className="card">
                <div className="card-body">
                  <h2 className="side-heading">Links</h2>
                  <ul className="side-list side-list--compact">
                    {profile.portfolio_url ? (
                      <li>
                        <span className="detail-fact-label">Portfolio</span>
                        <span className="detail-fact-value word-break">
                          <a href={profile.portfolio_url} target="_blank" rel="noreferrer">
                            {profile.portfolio_url}
                          </a>
                        </span>
                      </li>
                    ) : null}
                    {profile.linkedin_url ? (
                      <li>
                        <span className="detail-fact-label">LinkedIn</span>
                        <span className="detail-fact-value word-break">
                          <a href={profile.linkedin_url} target="_blank" rel="noreferrer">
                            {profile.linkedin_url}
                          </a>
                        </span>
                      </li>
                    ) : null}
                  </ul>
                  <p className="small text-muted profile-links__note">
                    Links open in a new tab. The platform does not verify external pages.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="card">
              <div className="card-body">
                <h2 className="side-heading">Privacy</h2>
                <ul className="side-list side-list--compact">
                  <li>Email addresses are never shown on public profiles.</li>
                  <li>Phone numbers stay private even when a profile is public.</li>
                  <li>Only contact details you choose to share as links are shown.</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
