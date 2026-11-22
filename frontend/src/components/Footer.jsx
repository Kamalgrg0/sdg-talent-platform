import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Brand } from "./Brand";

export function Footer() {
  const { user } = useAuth();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Brand footer />
          <p>Explore opportunities, talent, projects, and organizations across Nepal and beyond.</p>
        </div>

        <div className="footer-column">
          <h2>Explore</h2>
          <ul>
            <li>
              <Link to="/opportunities">Opportunities</Link>
            </li>
            <li>
              <Link to="/talent">Talent directory</Link>
            </li>
            <li>
              <Link to="/skills">Skills &amp; SDGs</Link>
            </li>
            <li>
              <Link to="/freelance">Freelance projects</Link>
            </li>
          </ul>
        </div>

        <div className="footer-column">
          <h2>Resources</h2>
          <ul>
            <li>
              <Link to="/enterprise">For organizations</Link>
            </li>
            <li>
              <Link to="/about">About the platform</Link>
            </li>
          </ul>
        </div>

        <div className="footer-column">
          <h2>Account</h2>
          <ul>
            {user ? (
              <>
                <li>
                  <Link to="/dashboard">Dashboard</Link>
                </li>
                {user.role === "job_seeker" || user.role === "freelancer" ? (
                  <li>
                    <Link to="/dashboard/profile">Talent profile</Link>
                  </li>
                ) : null}
                {user.role === "employer" || user.role === "organization" ? (
                  <li>
                    <Link to="/dashboard/organization-profile">Organization profile</Link>
                  </li>
                ) : null}
              </>
            ) : (
              <>
                <li>
                  <Link to="/login">Log in</Link>
                </li>
                <li>
                  <Link to="/register">Create an account</Link>
                </li>
                <li>
                  <Link to="/register">Join the talent pool</Link>
                </li>
              </>
            )}
            <li>
              <Link to="/contact">Contact</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="container footer-bottom">
        <p>
          &copy; {year} TalentBridge. All rights reserved.
        </p>
        <p>Skills-first hiring for sustainable development. Skill suggestions are rule-based and transparent.</p>
      </div>
    </footer>
  );
}
