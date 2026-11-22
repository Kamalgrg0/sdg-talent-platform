import { Link } from "react-router-dom";

export function BrandMark({ size = 40 }) {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 40 40" width={size} height={size} role="img" focusable="false">
        <rect width="40" height="40" rx="12" fill="currentColor" />
        <path
          d="M9 25.5c5.2-9.4 16.8-9.4 22 0"
          fill="none"
          stroke="#CDEBD9"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx="13" cy="14.5" r="3.1" fill="#E0B268" />
        <circle cx="27" cy="14.5" r="3.1" fill="#CDEBD9" />
      </svg>
    </span>
  );
}

export function Brand({ footer = false }) {
  return (
    <Link className={`brand${footer ? " brand--footer" : ""}`} to="/" aria-label="TalentBridge home">
      <BrandMark />
      <span className="brand-text">
        <span className="brand-name">TalentBridge</span>
      </span>
    </Link>
  );
}
