"""Canonical frontend paths used by notifications and email links.

Keeping these in one place prevents stale links from sending members to the
React 404 page. Older rows in the database are normalised on read as well, so
fixing a path here repairs previously created notifications immediately.
"""
from urllib.parse import urlparse

# Top-level routes declared in frontend/src/App.jsx.
ALLOWED_TOP_LEVEL = {
    "about",
    "community",
    "contact",
    "dashboard",
    "enterprise",
    "freelance",
    "messages",
    "notifications",
    "opportunities",
    "skills",
    "talent",
}

# Exact legacy paths that no longer exist in the React router.
EXACT_REWRITES = {
    "/dashboard/organization": "/dashboard/employer",
    "/manage-applicants": "/dashboard/employer",
}

# Legacy path prefixes that need a route prefix added.
PREFIX_REWRITES = (
    ("/manage-applicants/", "/dashboard/manage-applicants/"),
)


def dashboard_path_for(user):
    """Return the dashboard route the given account is allowed to open."""
    role = getattr(user, "role", "") or ""
    if role == "admin":
        return "/dashboard/admin"
    if role in {"employer", "organization"}:
        return "/dashboard/employer"
    if role == "freelancer":
        return "/dashboard/freelancer"
    return "/dashboard/job-seeker"


def normalize_frontend_link(link):
    """Return a safe internal SPA path for a stored notification link."""
    if not link:
        return ""

    value = str(link).strip()
    parsed = urlparse(value)
    if parsed.scheme and parsed.netloc:
        value = parsed.path or "/"
        if parsed.query:
            value = f"{value}?{parsed.query}"
    if not value.startswith("/"):
        value = f"/{value}"

    value = EXACT_REWRITES.get(value, value)
    for old, new in PREFIX_REWRITES:
        if value.startswith(old):
            value = f"{new}{value[len(old):]}"
            break

    if value == "/":
        return "/"
    top_level = value.strip("/").split("/", 1)[0]
    if top_level not in ALLOWED_TOP_LEVEL:
        # Let the SPA redirect to the recipient's own dashboard.
        return "/dashboard"
    return value
