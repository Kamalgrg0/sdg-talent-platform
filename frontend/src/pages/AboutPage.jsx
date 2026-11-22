import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About TalentBridge"
        title="Skills, opportunities, and the Global Goals"
        lead="TalentBridge helps people find purpose-driven opportunities, projects, and organizations."
      />

      <section className="section">
        <div className="container detail-layout">
          <article className="detail-main prose">
            <div className="detail-block">
              <h2>Why the platform exists</h2>
              <p>
                People build valuable digital, creative, and community skills every day. Organizations
                working on sustainable development need those skills, but the connection is often informal,
                opaque, or limited to people who already have the right networks. The platform makes that
                connection explicit: profiles are built around skills, and every opportunity can be linked
                to one of the 17 Sustainable Development Goals.
              </p>

              <h2>Who it is for</h2>
              <div className="who-grid">
                <div className="who-card">
                  <h3>Job seekers</h3>
                  <p>Find jobs, internships, fellowships, volunteer roles, and training opportunities.</p>
                </div>
                <div className="who-card">
                  <h3>Freelancers</h3>
                  <p>Bid on short-term projects and build a public portfolio of purposeful work.</p>
                </div>
                <div className="who-card">
                  <h3>Employers</h3>
                  <p>Publish roles, review applicants, send offers, and hire in one workspace.</p>
                </div>
                <div className="who-card">
                  <h3>Organizations</h3>
                  <p>Maintain a public profile, run programmes, and coordinate contributors and proposals.</p>
                </div>
              </div>

              <h2>The SDG connection</h2>
              <p>
                Each talent profile can list up to five SDG priorities, and each opportunity or project can
                be linked to one goal. This makes it possible to search for work by the change you want to
                make, not only by job title. The skills catalogue also shows which skills are most requested
                in open opportunities and how many public profiles list them.
              </p>

              <h2>How hiring works</h2>
              <ul className="feature-list feature-list--compact">
                <li>Employers move applications through reviewing and shortlisting.</li>
                <li>The employer sends a formal offer; the candidate accepts or declines it.</li>
                <li>Both sides receive in-app notifications and email updates at each step.</li>
                <li>Members message each other in private threads tied to the opportunity.</li>
                <li>Public talent profiles never expose email addresses or phone numbers.</li>
              </ul>

              <div className="notice notice--info">
                <p>
                  <strong>Privacy by default.</strong> Contact details stay private, and conversations are
                  visible only to the two people in the thread. Payment and contract terms are arranged
                  directly between organizations and talent.
                </p>
              </div>

              <div className="cta-actions mt-4">
                <Link className="btn btn--primary" to="/opportunities">
                  Explore opportunities
                </Link>
                <Link className="btn btn--outline" to="/contact">
                  Contact the administrator
                </Link>
              </div>
            </div>
          </article>

          <aside className="detail-side">
            <div className="card">
              <div className="card-body">
                <h2 className="side-heading">At a glance</h2>
                <ul className="side-list">
                  <li>
                    <strong>17</strong> SDGs to align work with
                  </li>
                  <li>
                    <strong>4</strong> public account types
                  </li>
                  <li>
                    <strong>5</strong> opportunity types
                  </li>
                  <li>
                    <strong>1</strong> shared inbox for every conversation
                  </li>
                </ul>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <h2 className="side-heading">Built with</h2>
                <p className="small text-muted">
                  React single-page frontend, Django REST Framework API, and a MySQL/MariaDB database.
                  Development is local and self-contained.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
