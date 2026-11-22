import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";

export default function NotFoundPage() {
  return (
    <>
      <PageHeader
        eyebrow="404"
        title="That page could not be found"
        lead="The link may be out of date, or the page may have moved."
      />
      <section className="section">
        <div className="container">
          <div className="empty-state">
            <span className="empty-state__icon" aria-hidden="true">
              ◇
            </span>
            <h3>Nothing here</h3>
            <p>Try one of the main sections below.</p>
            <div className="quick-actions" style={{ justifyContent: "center" }}>
              <Link className="btn btn--primary" to="/">
                Home
              </Link>
              <Link className="btn btn--outline" to="/opportunities">
                Opportunities
              </Link>
              <Link className="btn btn--outline" to="/talent">
                Talent directory
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
