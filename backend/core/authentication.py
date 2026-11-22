"""Authentication classes for the React SPA."""
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import SAFE_METHODS


class CsrfSessionAuthentication(SessionAuthentication):
    """Session auth that also requires CSRF for anonymous unsafe requests.

    DRF's SessionAuthentication only enforces CSRF once a user is logged in.
    This subclass requires a token for every state-changing request, including
    login and registration.
    """

    def authenticate(self, request):
        result = super().authenticate(request)
        if request.method not in SAFE_METHODS:
            self.enforce_csrf(request)
        return result
