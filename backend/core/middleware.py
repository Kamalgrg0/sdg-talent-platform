"""Request middleware that enforces account status on every request."""
from django.contrib.auth import logout
from django.http import JsonResponse


class ActiveAccountMiddleware:
    """Log out suspended or inactive users and reject their API requests.

    Account status is checked on every request, so a suspension takes effect
    immediately for session-authenticated requests.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = getattr(request, "user", None)
        if user is not None and user.is_authenticated:
            if not user.is_active or getattr(user, "status", "active") != "active":
                logout(request)
                if request.path.startswith("/api/"):
                    return JsonResponse(
                        {"detail": "This account has been suspended. Please contact an administrator.", "errors": None},
                        status=403,
                    )
        return self.get_response(request)
