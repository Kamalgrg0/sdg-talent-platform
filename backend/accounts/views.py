from django.contrib.auth import login, logout
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import SDG, Skill, UserSkill
from core.permissions import IsAdmin, IsEmployerSide, IsTalent
from opportunities.models import Invitation, Opportunity, TalentProject

from .models import Availability, Organization, Profile, Role, User
from .serializers import (
    AdminUserSerializer,
    LoginSerializer,
    OrganizationSerializer,
    ProfileCreateSerializer,
    ProfileSerializer,
    PublicProfileSerializer,
    RegisterSerializer,
    SDGSerializer,
    UserSerializer,
)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        return Response({"detail": "CSRF cookie set."})


class RegisterView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        login(request, user)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        login(request, user)
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({"detail": "Signed out."})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class MyProfileView(APIView):
    permission_classes = [IsAuthenticated, IsTalent]

    def get(self, request):
        profile = getattr(request.user, "profile", None)
        if not profile:
            return Response({"detail": "No profile yet."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ProfileSerializer(profile, context={"request": request}).data)

    def put(self, request):
        profile = getattr(request.user, "profile", None)
        context = {"request": request}
        if profile:
            serializer = ProfileSerializer(profile, data=request.data, partial=True, context=context)
        else:
            serializer = ProfileCreateSerializer(data=request.data, context=context)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProfileSerializer(serializer.instance, context=context).data)


class TalentDirectoryView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = PublicProfileSerializer

    def get_queryset(self):
        qs = (
            Profile.objects.filter(is_public=True, user__status="active")
            .select_related("user")
            .prefetch_related("user__user_skills__skill__category", "user__user_sdgs__sdg")
        )
        params = self.request.query_params
        keyword = params.get("q", "").strip()
        if keyword:
            qs = qs.filter(
                Q(user__name__icontains=keyword)
                | Q(professional_title__icontains=keyword)
                | Q(bio__icontains=keyword)
                | Q(user__user_skills__skill__name__icontains=keyword)
            ).distinct()
        skill = params.get("skill")
        if skill:
            qs = qs.filter(user__user_skills__skill_id=skill)
        sdg = params.get("sdg")
        if sdg:
            qs = qs.filter(user__user_sdgs__sdg_id=sdg)
        location = params.get("location", "").strip()
        if location:
            qs = qs.filter(location__icontains=location)
        availability = params.get("availability")
        if availability:
            qs = qs.filter(availability=availability)
        return qs.order_by("-updated_at")


class TalentOptionsView(APIView):
    permission_classes = [AllowAny]
    """Distinct filter choices for the public talent directory."""

    def get(self, request):
        qs = Profile.objects.filter(
            is_public=True,
            user__status="active",
            user__role__in=[Role.JOB_SEEKER, Role.FREELANCER],
        )
        locations = (
            qs.exclude(location="")
            .values("location")
            .annotate(count=Count("id"))
            .order_by("location")
        )
        return Response(
            {
                "locations": [
                    {"value": row["location"], "count": row["count"]} for row in locations
                ],
                "availabilities": [
                    {"value": value, "label": label} for value, label in Availability.choices
                ],
            }
        )


class PublicProfileView(RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = PublicProfileSerializer

    def get_queryset(self):
        return Profile.objects.filter(is_public=True, user__status="active").select_related("user")


class MyOrganizationView(APIView):
    permission_classes = [IsAuthenticated, IsEmployerSide]

    def get(self, request):
        org = getattr(request.user, "organization", None)
        if not org:
            return Response({"detail": "No organization linked to this account."}, status=status.HTTP_404_NOT_FOUND)
        return Response(OrganizationSerializer(org).data)

    def put(self, request):
        org = getattr(request.user, "organization", None)
        if not org:
            return Response({"detail": "No organization linked to this account."}, status=status.HTTP_404_NOT_FOUND)
        serializer = OrganizationSerializer(org, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class OrganizationDetailView(RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = OrganizationSerializer
    queryset = Organization.objects.all()


class InvitationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from opportunities.serializers import InvitationSerializer

        if request.user.is_employer_side:
            qs = Invitation.objects.filter(organization__owner_user=request.user)
        else:
            qs = Invitation.objects.filter(talent=request.user)
        qs = qs.select_related("sender", "organization", "talent", "talent_project", "opportunity", "freelance_project")
        return Response(InvitationSerializer(qs, many=True).data)

    def post(self, request):
        from opportunities.views import InvitationCreateView

        if not request.user.is_employer_side:
            return Response({"detail": "An employer or organization account is required."}, status=403)
        return InvitationCreateView().post(request)


class AdminUserListView(ListAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = User.objects.all().select_related("profile", "organization")
        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)
        keyword = self.request.query_params.get("q", "").strip()
        if keyword:
            qs = qs.filter(Q(name__icontains=keyword) | Q(email__icontains=keyword))
        return qs.order_by("id")


class AdminUserDetailView(APIView):
    permission_classes = [IsAdmin]

    # Administrators may move accounts between the four public roles, but the
    # ``admin`` role itself can only be granted from the CLI.
    ASSIGNABLE_ROLES = {
        Role.JOB_SEEKER,
        Role.FREELANCER,
        Role.EMPLOYER,
        Role.ORGANIZATION,
    }
    ASSIGNABLE_STATUSES = {"active", "suspended"}

    def patch(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        errors = {}
        updates = {}

        if "role" in request.data:
            role = request.data["role"]
            if user.role == Role.ADMIN:
                errors["role"] = "Administrator roles cannot be changed from the API."
            elif role not in self.ASSIGNABLE_ROLES:
                errors["role"] = "Invalid role."
            else:
                updates["role"] = role

        if "status" in request.data:
            status_value = request.data["status"]
            if status_value not in self.ASSIGNABLE_STATUSES:
                errors["status"] = "Invalid status."
            elif user == request.user and status_value == "suspended":
                errors["status"] = "You cannot suspend your own account."
            else:
                updates["status"] = status_value

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        if not updates:
            return Response({"detail": "Nothing to update."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = AdminUserSerializer(user, data=updates, partial=True)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save()
            if "status" in updates:
                user.is_active = updates["status"] == "active"
                user.save(update_fields=["is_active"])
        return Response(AdminUserSerializer(user).data)
