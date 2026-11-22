import { initials } from "../lib/format";

export function Avatar({ name, size = "sm" }) {
  const className = size === "sm" ? "avatar avatar--sm" : `avatar avatar--${size}`;
  return (
    <span className={className} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
