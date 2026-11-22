
from rest_framework.permissions import BasePermission, SAFE_METHODS


def is_active_account(user):
    return bool(
        user
        and user.is_authenticated
        and user.is_active
        and getattr(user, "status", None) == "active"
    )


class IsAdmin(BasePermission):
    message = "Administrator access required."

    def has_permission(self, request, view):
        return (
            is_active_account(request.user)
            and request.user.role == "admin"
        )


class IsEmployerSide(BasePermission):
    message = "An employer or organization account is required."

    def has_permission(self, request, view):
        return (
            is_active_account(request.user)
            and request.user.role in {"employer", "organization", "admin"}
        )


class IsTalent(BasePermission):
    message = "A job seeker or freelancer account is required."

    def has_permission(self, request, view):
        return (
            is_active_account(request.user)
            and request.user.role in {"job_seeker", "freelancer"}
        )


class ReadOnlyOrAdmin(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True

        return (
            is_active_account(request.user)
            and request.user.role == "admin"
        )


class IsAuthenticatedOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True

        return is_active_account(request.user)
