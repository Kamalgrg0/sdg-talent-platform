"""Root URL configuration: REST API under /api/ and the React SPA fallback."""
from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path, re_path
from django.conf import settings
from django.views.static import serve


def spa_index(request):
    """Serve the built React app's index.html (production)."""
    index = settings.FRONTEND_DIST / "index.html"
    if index.exists():
        return HttpResponse(index.read_text(encoding="utf-8"))
    return HttpResponse(
        "<h1>TalentBridge API</h1><p>The React frontend is not built yet. "
        "Run <code>npm install &amp;&amp; npm run build</code> in <code>frontend/</code>, "
        "or start the Vite dev server on <code>http://localhost:5173</code>.</p>",
        content_type="text/html",
    )


urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/catalog/", include("catalog.urls")),
    path("api/opportunities/", include("opportunities.urls")),
    path("api/freelance/", include("freelance.urls")),
    path("api/community/", include("community.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/messaging/", include("messaging.urls")),
    path("api/", include("core.urls")),
]

if settings.DEBUG:
    urlpatterns += [re_path(r"^assets/(?P<path>.*)$", serve, {"document_root": settings.FRONTEND_DIST / "assets"})]

# SPA catch-all (must be last).
urlpatterns += [re_path(r"^(?!api/|django-admin/|static/|assets/).*$", spa_index)]
