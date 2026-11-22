import { firstErrorText, joinedErrorText } from "./errorText.js";

export const OPPORTUNITY_TYPES = [
  { value: "job", label: "Job" },
  { value: "internship", label: "Internship" },
  { value: "fellowship", label: "Fellowship" },
  { value: "volunteer", label: "Volunteer" },
  { value: "training", label: "Training" },
];

export const AVAILABILITY_OPTIONS = [
  { value: "2-5", label: "2-5 hours / week" },
  { value: "5-10", label: "5-10 hours / week" },
  { value: "10-20", label: "10-20 hours / week" },
  { value: "20+", label: "20+ hours / week" },
];

export const SKILL_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
];

export const APPLICATION_STATUSES = [
  { value: "submitted", label: "Submitted" },
  { value: "reviewing", label: "Reviewing" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "offered", label: "Offer sent" },
  { value: "accepted", label: "Offer accepted" },
  { value: "declined", label: "Offer declined" },
  { value: "rejected", label: "Rejected" },
  { value: "hired", label: "Hired" },
];

// Offer sent, accepted, and declined are driven by the candidate, so the
// employer pipeline only exposes the transitions the employer owns.
export const EMPLOYER_APPLICATION_STATUSES = APPLICATION_STATUSES.filter((status) =>
  ["reviewing", "shortlisted", "offered", "rejected"].includes(status.value)
);

export const PROPOSAL_STATUSES = [
  { value: "submitted", label: "Submitted" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

export const POST_TYPES = [
  { value: "discussion", label: "Discussion" },
  { value: "announcement", label: "Announcement" },
  { value: "event", label: "Event" },
  { value: "resource", label: "Resource" },
];

export const REGISTER_ROLES = [
  {
    value: "job_seeker",
    name: "Job seeker",
    text: "Find jobs, internships, and fellowships that match your skills and SDG priorities.",
  },
  {
    value: "freelancer",
    name: "Freelancer",
    text: "Bid on short-term projects and build a public portfolio of purposeful work.",
  },
  {
    value: "employer",
    name: "Employer",
    text: "Post opportunities, review applicants, and hire skilled people for your team.",
  },
  {
    value: "organization",
    name: "Organization",
    text: "Run an organization profile, publish programmes, and coordinate contributors.",
  },
];

export const ROLE_LABELS = {
  job_seeker: "Job seeker",
  freelancer: "Freelancer",
  employer: "Employer",
  organization: "Organization",
  admin: "Administrator",
};

export const APPLICATION_STATUS_CLASSES = {
  submitted: "badge--slate",
  reviewing: "badge--blue",
  shortlisted: "badge--amber",
  offered: "badge--blue",
  accepted: "badge--green",
  declined: "badge--rose",
  rejected: "badge--rose",
  hired: "badge--green",
};

export const PROPOSAL_STATUS_CLASSES = {
  submitted: "badge--slate",
  shortlisted: "badge--amber",
  accepted: "badge--green",
  rejected: "badge--rose",
  withdrawn: "badge--slate",
};

export const INVITATION_STATUS_CLASSES = {
  sent: "badge--amber",
  accepted: "badge--green",
  declined: "badge--rose",
  withdrawn: "badge--slate",
};

export const POST_STATUS_CLASSES = {
  published: "badge--green",
  hidden: "badge--rose",
};

export const USER_STATUS_CLASSES = {
  active: "badge--green",
  suspended: "badge--rose",
};

export const NOTIFICATION_TYPE_LABELS = {
  new_application: "New application",
  new_proposal: "New proposal",
  application_status: "Application update",
  application_received: "Application sent",
  proposal_status: "Proposal update",
  project_status: "Project update",
  invitation: "Invitation",
  invitation_status: "Invitation reply",
  message: "Message",
  offer_received: "Job offer",
  offer_response: "Offer reply",
  system: "Account",
};

export const NOTIFICATION_TYPE_CLASSES = {
  new_application: "badge--blue",
  new_proposal: "badge--blue",
  application_status: "badge--amber",
  application_received: "badge--slate",
  proposal_status: "badge--amber",
  project_status: "badge--amber",
  invitation: "badge--green",
  invitation_status: "badge--green",
  message: "badge--blue",
  offer_received: "badge--green",
  offer_response: "badge--amber",
  system: "badge--slate",
};

export function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMoney(value) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  return `NPR ${number.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function daysUntil(value) {
  if (!value) return null;
  const target = new Date(`${value}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function deadlineLabel(value) {
  const days = daysUntil(value);
  if (days === null) return "No deadline";
  if (days < 0) return "Deadline passed";
  if (days === 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  if (days <= 7) return `Closes in ${days} days`;
  return `Closes ${formatDate(value)}`;
}

export function isDeadlineSoon(value) {
  const days = daysUntil(value);
  return days !== null && days >= 0 && days <= 7;
}

export function availabilityLabel(value) {
  const option = AVAILABILITY_OPTIONS.find((item) => item.value === value);
  return option ? option.label : value || "—";
}

export function roleLabel(value) {
  return ROLE_LABELS[value] || value || "—";
}

export function dashboardPathForRole(role) {
  if (role === "employer" || role === "organization") return "/dashboard/employer";
  if (role === "admin") return "/dashboard/admin";
  if (role === "freelancer") return "/dashboard/freelancer";
  return "/dashboard/job-seeker";
}

export function truncate(text, length = 160) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1).trimEnd()}…`;
}

export function errorMessage(error) {
  return firstErrorText(error?.message ?? error);
}

export function fieldError(errors, field) {
  if (!errors || typeof errors !== "object") return "";
  return joinedErrorText(errors[field]);
}

export function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function futureISO(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
