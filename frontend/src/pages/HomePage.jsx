import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorNotice } from "../components/ErrorNotice";
import { Loading } from "../components/Loading";
import { OpportunityCard } from "../components/OpportunityCard";
import { api } from "../lib/api";
import { deadlineLabel } from "../lib/format";

const STEPS = [
  ["Create your profile", "Add your skills, experience, availability, and the SDGs you care about."],
  ["Discover opportunities", "Filter jobs, fellowships, volunteer roles, and freelance projects by what matters to you."],
  ["Apply or propose", "Send one thoughtful application or proposal with the experience that fits the work."],
  ["Collaborate", "Work with organizations, communities, and teams on practical sustainable development projects."],
  ["Grow your career", "Build experience, references, and income while contributing to the Global Goals."],
];

export default function HomePage() {
  const [home, setHome] = useState(null);
  const [sdgs, setSdgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [homeData, sdgData] = await Promise.all([
        api.get("/api/home/"),
        api.get("/api/catalog/sdgs/"),
      ]);
      setHome(homeData);
      setSdgs(Array.isArray(sdgData) ? sdgData : []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <Loading label="Loading the platform…" large />;
  if (error) {
    return (
      <div className="container section">
        <ErrorNotice message={error.message} onRetry={load} />
      </div>
    );
  }

  const stats = home?.stats || {};
  const featured = home?.featured_opportunities || [];
  const latestCommunity = home?.latest_community || [];
  const mosaic = sdgs.slice(0, 16);

  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-copy">
              <span className="eyebrow eyebrow--light">TalentBridge</span>
              <h1>
                Turn <span className="highlight">skills</span> into sustainable impact.
              </h1>
              <p className="hero-lead">
                Find purpose-driven jobs, fellowships, volunteer roles, and freelance projects. Build a
                profile around your skills and the Sustainable Development Goals you care about.
              </p>
              <div className="hero-actions">
                <Link className="btn btn--light btn--lg" to="/opportunities">
                  Explore opportunities
                </Link>
                <Link className="btn btn--outline-light btn--lg" to="/talent">
                  Browse talent
                </Link>
              </div>
              <div className="hero-note">
                <span>Free to join</span>
                <span>Email notifications</span>
                <span>No payment required</span>
              </div>
            </div>

            <div className="hero-art">
              <div className="hero-mosaic" aria-hidden="true">
                {mosaic.map((sdg) => (
                  <span key={sdg.id} style={{ "--sdg-color": sdg.color_hex }} />
                ))}
              </div>

              <aside className="hero-panel" aria-label="Latest open opportunities">
                <div className="hero-panel-head">
                  <div>
                    <p>Live now</p>
                    <strong>{stats.opportunities || 0} open opportunities</strong>
                  </div>
                  <span className="hero-panel-badge">Updated live</span>
                </div>

                {featured.length > 0 ? (
                  <div className="hero-panel-list">
                    {featured.slice(0, 3).map((opportunity) => (
                      <Link className="hero-mini" to={`/opportunities/${opportunity.id}`} key={opportunity.id}>
                        <span
                          className="hero-mini-dot"
                          style={{ "--sdg-color": opportunity.sdg?.color_hex || "#CDEBD9" }}
                        />
                        <span>
                          <span className="hero-mini-title">{opportunity.title}</span>
                          <span className="hero-mini-meta">
                            {opportunity.organization?.name || "Organization"} · {deadlineLabel(opportunity.deadline)}
                          </span>
                        </span>
                        <span className="hero-mini-arrow" aria-hidden="true">
                          →
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="hero-mini-meta" style={{ padding: "18px 0" }}>
                    New opportunities will appear here.
                  </p>
                )}

                <Link className="hero-panel-link" to="/opportunities">
                  Browse every opportunity →
                </Link>
              </aside>
            </div>
          </div>

          <div className="hero-stats" aria-label="Platform statistics">
            <div className="stat-card">
              <span className="stat-value">{(stats.talent || 0).toLocaleString()}</span>
              <span className="stat-label">Public talent profiles</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{(stats.opportunities || 0).toLocaleString()}</span>
              <span className="stat-label">Open opportunities</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{(stats.organizations || 0).toLocaleString()}</span>
              <span className="stat-label">Organizations</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{(stats.projects || 0).toLocaleString()}</span>
              <span className="stat-label">Open talent and freelance projects</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section featured-section">
        <div className="container">
          <div className="section-head">
            <div className="section-head__text">
              <span className="eyebrow">Featured opportunities</span>
              <h2>Work that moves the goals forward</h2>
              <p>
                Open roles from organizations looking for people with the skills to make a difference in
                climate, education, equality, and digital work.
              </p>
            </div>
            <Link className="section-link" to="/opportunities">
              See all opportunities
            </Link>
          </div>

          {featured.length === 0 ? (
            <div className="empty-state">
              <h3>No open opportunities right now</h3>
              <p>New roles are added by employers and organizations. Check back soon or join the talent pool.</p>
              <Link className="btn btn--primary" to="/register">
                Create an account
              </Link>
            </div>
          ) : (
            <div className="card-grid">
              {featured.map((opportunity) => (
                <OpportunityCard key={opportunity.id} opportunity={opportunity} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section section--muted">
        <div className="container">
          <div className="section-head">
            <div className="section-head__text">
              <span className="eyebrow">The Global Goals</span>
              <h2>17 goals. Many ways to contribute.</h2>
              <p>
                Every opportunity can be linked to an SDG, so you can search for work that matches the change
                you want to make.
              </p>
            </div>
            <Link className="section-link" to="/skills">
              Explore skills and SDGs
            </Link>
          </div>

          <div className="sdg-grid">
            {sdgs.map((sdg) => (
              <Link
                className="sdg-card"
                to={`/opportunities?sdg=${sdg.id}`}
                style={{ "--sdg-color": sdg.color_hex }}
                key={sdg.id}
              >
                <span className="sdg-card__number">{Number(String(sdg.code).replace(/\D/g, "")) || sdg.id}</span>
                <span className="sdg-card__body">
                  <span className="sdg-card__name">{sdg.name}</span>
                  <span className="sdg-card__count">
                    {sdg.open_count || 0} open {(sdg.open_count || 0) === 1 ? "opportunity" : "opportunities"}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div className="section-head__text">
              <span className="eyebrow">How it works</span>
              <h2>Five steps from profile to impact</h2>
              <p>A clear path for talented people and the organizations that need them.</p>
            </div>
          </div>

          <ol className="steps">
            {STEPS.map(([title, text], index) => (
              <li className="step-card" key={title}>
                <span className="step-number">{index + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {latestCommunity.length > 0 ? (
        <section className="section section--muted">
          <div className="container">
            <div className="section-head">
              <div className="section-head__text">
                <span className="eyebrow">Community</span>
                <h2>Latest from the community</h2>
              </div>
              <Link className="section-link" to="/community">
                Visit the community
              </Link>
            </div>
            <div className="card-grid">
              {latestCommunity.map((post) => (
                <article className="card" key={post.id}>
                  <div className="card-body">
                    <span className="badge badge--blue">{post.type}</span>
                    <h3 className="card-title mt-2">
                      <Link to={`/community/${post.id}`}>{post.title}</Link>
                    </h3>
                    <p className="card-meta">
                      <span>{post.author}</span>
                    </p>
                    <Link className="link-arrow" to={`/community/${post.id}`}>
                      Read post
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section section--tight">
        <div className="container">
          <div className="cta-panel">
            <div>
              <span className="eyebrow eyebrow--light">Start today</span>
              <h2>Your next opportunity starts with a profile.</h2>
              <p>
                Join as a job seeker, freelancer, employer, or organization. Create a free account and start
                connecting skills with meaningful work.
              </p>
            </div>
            <div className="cta-actions">
              <Link className="btn btn--light btn--lg" to="/register">
                Create a free account
              </Link>
              <Link className="btn btn--outline-light btn--lg" to="/talent">
                Browse talent
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
