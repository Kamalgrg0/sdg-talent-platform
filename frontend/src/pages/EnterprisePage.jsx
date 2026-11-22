import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

export default function EnterprisePage() {
  const { user, isEmployerSide, isAuthenticated } = useAuth();
  const [stats, setStats] = useState({ talent: 0, opportunities: 0, organizations: 0, projects: 0 });

  useEffect(() => {
    let active = true;
    api
      .get("/api/home/")
      .then((data) => {
        if (active && data?.stats) setStats(data.stats);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  let primaryCtaLabel = "Create an organization account";
  let primaryCtaTo = "/register";
  let secondaryCtaLabel = "Browse the talent directory";
  let secondaryCtaTo = "/talent";

  if (isEmployerSide) {
    primaryCtaLabel = "Open your workspace";
    primaryCtaTo = "/dashboard";
    secondaryCtaLabel = "Edit organization profile";
    secondaryCtaTo = "/dashboard/organization-profile";
  } else if (isAuthenticated) {
    primaryCtaLabel = "Browse the talent directory";
    primaryCtaTo = "/talent";
    secondaryCtaLabel = "Explore opportunities";
    secondaryCtaTo = "/opportunities";
  }

  const features = [
    {
      title: "Post opportunities",
      text: "Publish jobs, internships, fellowships, volunteer roles, and training opportunities with clear requirements, skills, and SDG alignment.",
    },
    {
      title: "Search skilled talent",
      text: "Browse public talent profiles filtered by skills, availability, and SDG interests. Contact details remain private until talent chooses to share them.",
    },
    {
      title: "Review applicants",
      text: "Track applications in one place, move candidates through reviewing and shortlisting, send formal offers, and keep every decision transparent.",
    },
    {
      title: "Invite candidates",
      text: "Reach out to relevant talent with invitations linked to an opportunity, freelance project, or talent project.",
    },
    {
      title: "Run freelance projects",
      text: "Post short paid project briefs, receive proposals from freelancers, and manage proposal statuses from your workspace.",
    },
    {
      title: "Manage your organization",
      text: "Keep your organization profile, listings, and hiring activity together in a single dashboard.",
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="For organizations"
        title="Hire and collaborate for sustainable impact"
        lead="Post opportunities, search skilled talent, review applicants, invite candidates, and manage projects from one organization workspace. Built for employers, nonprofits, cooperatives, and mission-driven teams."
        actions={
          <>
            <Link className="btn btn--primary btn--lg" to={primaryCtaTo}>{primaryCtaLabel}</Link>
            <Link className="btn btn--outline btn--lg" to={secondaryCtaTo}>{secondaryCtaLabel}</Link>
          </>
        }
      />

      <section className="section section--tight">
        <div className="container">
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
              <span className="stat-label">Open projects</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div className="section-head__text">
              <span className="eyebrow">Capabilities</span>
              <h2>Everything you need to work with talent</h2>
              <p>Tools for posting work, discovering candidates, and managing hiring in one place.</p>
            </div>
          </div>
          <div className="card-grid">
            {features.map((feature) => (
              <article className="card" key={feature.title}>
                <div className="card-body">
                  <h3 className="card-title">{feature.title}</h3>
                  <p>{feature.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--muted">
        <div className="container">
          <div className="section-head">
            <div className="section-head__text">
              <span className="eyebrow">How it works</span>
              <h2>From posting to hiring</h2>
            </div>
          </div>
          <ol className="steps">
            {[
              ["Create your organization profile", "Introduce your mission, location, and website so talent understands who you are."],
              ["Publish a role or project", "Describe the work, required skills, and SDG alignment with a clear deadline."],
              ["Discover and invite talent", "Search public profiles and invite candidates who fit the work."],
              ["Review and decide", "Track applications and proposals, shortlist candidates, and record hiring outcomes."],
            ].map(([title, text], index) => (
              <li className="step-card" key={title}>
                <span className="step-number">{index + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          <div className="cta-panel">
            <div>
              <span className="eyebrow eyebrow--light">Get started</span>
              <h2>Bring skilled people to your mission.</h2>
              <p>
                Create an employer or organization account to post opportunities, manage applicants, and
                collaborate with talent focused on sustainable development.
              </p>
            </div>
            <div className="cta-actions">
              <Link className="btn btn--light btn--lg" to={primaryCtaTo}>{primaryCtaLabel}</Link>
              <Link className="btn btn--outline-light btn--lg" to={secondaryCtaTo}>{secondaryCtaLabel}</Link>
            </div>
          </div>
          <p className="small text-muted" style={{ marginTop: "1rem", textAlign: "center" }}>
            Opportunities, proposals, and offers are managed inside the platform. Payments and contracts
            are arranged directly between organizations and talent.
          </p>
        </div>
      </section>
    </>
  );
}
