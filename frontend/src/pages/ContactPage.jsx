import { PageHeader } from "../components/PageHeader";

const TOPICS = [
  {
    title: "Account and login",
    text: "Check that your email and password are correct, then try again. If your account has been suspended, contact the platform administrator to ask for a review.",
  },
  {
    title: "Applications and proposals",
    text: "Track applications and proposals from your dashboard. Organizations review applications and shortlist proposals there; there is no separate email inbox for each role.",
  },
  {
    title: "Organization profiles",
    text: "Employer and organization accounts can edit their public profile from the dashboard. Ask the administrator about verification badges or a profile that needs correcting.",
  },
  {
    title: "Community moderation",
    text: "Report a post or comment by sending its link to the platform administrator. Administrators can hide inappropriate content, and authors can ask for their own post to be reviewed.",
  },
  {
    title: "Accessibility",
    text: "Tell us if a page is difficult to use with a keyboard, screen reader, or small screen. Include the page address and a short description of the barrier so it can be investigated.",
  },
  {
    title: "Security and privacy",
    text: "Report suspicious activity or a privacy concern immediately. Never send your password, and remember that public profiles are designed not to expose private contact details.",
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Get in touch"
        title="How to get help"
        lead="Find the right route for account, application, organization, moderation, and accessibility questions. Most requests are handled inside your account, and the address below is for anything that needs a person."
      />

      <section className="section">
        <div className="container detail-layout">
          <article className="detail-main">
            <div className="detail-block">
              <h2>Choose the right contact route</h2>
              <p className="text-muted">
                Most questions can be answered from your dashboard. For anything that needs a person, use the
                guidance below.
              </p>
            </div>

            <div className="contact-topics">
              {TOPICS.map((topic) => (
                <div className="card" key={topic.title}>
                  <div className="card-body">
                    <h3>{topic.title}</h3>
                    <p>{topic.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="detail-block contact-guidance">
              <h2>What to include in a message</h2>
              <ul className="feature-list feature-list--compact">
                <li>The page address or community post link you are asking about.</li>
                <li>Your account email, but never your password.</li>
                <li>A short description of what you expected and what happened.</li>
                <li>Any error message, copied exactly if possible.</li>
              </ul>
            </div>

            <div className="notice notice--info">
              <p>
                <strong>Notifications are delivered by email.</strong> Applications, proposals, offers, and
                messages stay inside the platform, and a copy is sent to the address on your account. The
                address on this page reaches the platform team.
              </p>
            </div>
          </article>

          <aside className="detail-side">
            <div className="card">
              <div className="card-body">
                <h2 className="side-heading">Platform administrator</h2>
                <p className="contact-email">
                  <a href="mailto:hello@sdgtalent.example">hello@sdgtalent.example</a>
                </p>
                <p className="small text-muted">
                  For account reviews, verification, moderation, accessibility, and security questions.
                </p>
                <a className="btn btn--primary btn--block" href="mailto:hello@sdgtalent.example">
                  Open email app
                </a>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h2 className="side-heading">Before you write</h2>
                <ul className="side-list side-list--compact">
                  <li>Check your dashboard for application and proposal status.</li>
                  <li>Use the organization profile editor for public details.</li>
                  <li>Never share passwords or private contact details publicly.</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
