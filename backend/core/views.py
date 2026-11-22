from datetime import timedelta

from django.conf import settings
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Organization, Profile, Role, User
from accounts.serializers import AdminUserSerializer, OrganizationSerializer, PublicProfileSerializer
from catalog.models import SDG
from catalog.serializers import SDGSerializer
from community.models import Comment, CommunityPost, PostStatus
from core.permissions import IsAdmin
from freelance.models import FreelanceProject, Proposal
from notifications.models import EmailOutbox, Notification
from opportunities.models import Application, Invitation, InvitationStatus, Opportunity, SavedOpportunity, TalentProject
from opportunities.serializers import ApplicationSerializer, OpportunityListSerializer


class HomeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        today = timezone.localdate()
        open_opportunities = Opportunity.objects.filter(
            status="open", deadline__gte=today
        ).select_related("organization", "sdg").prefetch_related("skills")
        featured = open_opportunities.order_by("-created_at")[:4]
        stats = {
            "talent": Profile.objects.filter(is_public=True, user__status="active").count(),
            "opportunities": open_opportunities.count(),
            "organizations": Organization.objects.count(),
            "projects": TalentProject.objects.filter(status="open", deadline__gte=today).count()
            + FreelanceProject.objects.filter(status="open", deadline__gte=today).count(),
            "applications": Application.objects.count(),
            "community_posts": CommunityPost.objects.filter(status=PostStatus.PUBLISHED).count(),
        }
        return Response(
            {
                "stats": stats,
                "featured_opportunities": OpportunityListSerializer(
                    featured, many=True, context={"request": request}
                ).data,
                "sdgs": SDGSerializer(SDG.objects.all(), many=True).data,
                "latest_community": [
                    {
                        "id": post.id,
                        "title": post.title,
                        "type": post.type,
                        "author": post.user.name,
                        "created_at": post.created_at,
                    }
                    for post in CommunityPost.objects.filter(status=PostStatus.PUBLISHED)
                    .select_related("user")
                    .order_by("-created_at")[:3]
                ],
            }
        )


def _profile_completeness(user):
    profile = getattr(user, "profile", None)
    if not profile:
        return {"percent": 0, "missing": ["profile"]}
    checks = {
        "professional title": bool(profile.professional_title),
        "location": bool(profile.location),
        "bio": bool(profile.bio),
        "availability": bool(profile.availability),
        "skills": user.user_skills.exists(),
        "SDG interests": user.user_sdgs.exists(),
    }
    done = sum(1 for value in checks.values() if value)
    missing = [label for label, value in checks.items() if not value]
    return {"percent": round(done / len(checks) * 100), "missing": missing}


def _recommended_opportunities(user, limit=4):
    today = timezone.localdate()
    qs = Opportunity.objects.filter(status="open", deadline__gte=today).select_related(
        "organization", "sdg"
    ).prefetch_related("skills")
    skill_ids = list(user.user_skills.values_list("skill_id", flat=True))
    sdg_ids = list(user.user_sdgs.values_list("sdg_id", flat=True))
    criteria = Q()
    if skill_ids:
        criteria |= Q(skills__id__in=skill_ids)
    if sdg_ids:
        criteria |= Q(sdg_id__in=sdg_ids)
    if criteria:
        matched = qs.filter(criteria).distinct().order_by("-created_at")[:limit]
        if matched:
            return matched
    return qs.order_by("-created_at")[:limit]


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.role
        payload = {
            "user": AdminUserSerializer(user).data,
            "role": role,
            "unread_notifications": Notification.objects.filter(user=user, is_read=False).count(),
        }

        if role in {Role.JOB_SEEKER, Role.FREELANCER}:
            profile = getattr(user, "profile", None)
            payload["profile"] = PublicProfileSerializer(profile).data if profile else None
            payload["completeness"] = _profile_completeness(user)
            payload["applications"] = ApplicationSerializer(
                Application.objects.filter(user=user)
                .select_related("opportunity", "opportunity__organization", "user")
                .order_by("-created_at")[:5],
                many=True,
            ).data
            payload["saved"] = OpportunityListSerializer(
                Opportunity.objects.filter(saved_by__user=user)
                .select_related("organization", "sdg")
                .prefetch_related("skills")
                .order_by("-created_at")[:5],
                many=True,
                context={"request": request},
            ).data
            payload["recommended"] = OpportunityListSerializer(
                _recommended_opportunities(user), many=True, context={"request": request}
            ).data
            payload["invitations"] = _invitation_payload(user)
            if role == Role.FREELANCER:
                proposals = (
                    Proposal.objects.filter(freelancer=user)
                    .select_related("freelance_project", "freelancer")
                    .order_by("-created_at")
                )
                payload["proposals"] = [
                    {
                        "id": p.id,
                        "project": p.freelance_project.title,
                        "bid_amount": str(p.bid_amount),
                        "delivery_days": p.delivery_days,
                        "status": p.status,
                        "created_at": p.created_at,
                    }
                    for p in proposals[:8]
                ]
                payload["active_projects"] = list(
                    FreelanceProject.objects.filter(
                        proposals__freelancer=user, proposals__status="accepted"
                    )
                    .distinct()
                    .values("id", "title", "status", "budget_npr", "deadline")[:5]
                )
        else:
            organization = getattr(user, "organization", None)
            payload["organization"] = OrganizationSerializer(organization).data if organization else None
            opportunities = (
                Opportunity.objects.filter(created_by=user)
                .select_related("organization", "sdg")
                .prefetch_related("skills")
                .annotate(applicant_count=Count("applications", distinct=True))
                .order_by("-created_at")
            )
            payload["opportunities"] = OpportunityListSerializer(
                opportunities[:6], many=True, context={"request": request}
            ).data
            payload["counts"] = {
                "opportunities": opportunities.count(),
                "applicants": Application.objects.filter(opportunity__created_by=user).count(),
                "shortlisted": Application.objects.filter(
                    opportunity__created_by=user, status="shortlisted"
                ).count(),
                "offers_sent": Application.objects.filter(
                    opportunity__created_by=user, status="offered"
                ).count(),
                "offers_accepted": Application.objects.filter(
                    opportunity__created_by=user, status="accepted"
                ).count(),
                "offers_declined": Application.objects.filter(
                    opportunity__created_by=user, status="declined"
                ).count(),
                "invitations": Invitation.objects.filter(organization__owner_user=user).count(),
                "talent_projects": TalentProject.objects.filter(created_by=user).count(),
                "freelance_projects": FreelanceProject.objects.filter(client=user).count(),
                "proposals": Proposal.objects.filter(freelance_project__client=user).count(),
            }
            payload["invitations"] = _invitation_payload(user)
            payload["talent_projects"] = list(
                TalentProject.objects.filter(created_by=user)
                .order_by("-created_at")
                .values("id", "title", "status", "deadline", "talent_required")[:6]
            )
            payload["freelance_projects"] = list(
                FreelanceProject.objects.filter(client=user)
                .annotate(proposal_count=Count("proposals"))
                .order_by("-created_at")
                .values("id", "title", "status", "budget_npr", "deadline", "proposal_count")[:6]
            )
            if role == Role.ADMIN:
                payload["admin_stats"] = _admin_stats()
        return Response(payload)


def _invitation_payload(user):
    from opportunities.serializers import InvitationSerializer

    qs = Invitation.objects.filter(talent=user) if user.is_talent else Invitation.objects.filter(
        organization__owner_user=user
    )
    qs = qs.select_related("sender", "organization", "talent", "talent_project", "opportunity", "freelance_project")
    return InvitationSerializer(qs[:8], many=True).data


def _admin_stats():
    today = timezone.localdate()
    return {
        "users": User.objects.count(),
        "talent": User.objects.filter(role__in=[Role.JOB_SEEKER, Role.FREELANCER]).count(),
        "employers": User.objects.filter(role__in=[Role.EMPLOYER, Role.ORGANIZATION]).count(),
        "suspended": User.objects.filter(status="suspended").count(),
        "opportunities": Opportunity.objects.count(),
        "open_opportunities": Opportunity.objects.filter(status="open", deadline__gte=today).count(),
        "organizations": Organization.objects.count(),
        "applications": Application.objects.count(),
        "talent_projects": TalentProject.objects.count(),
        "freelance_projects": FreelanceProject.objects.count(),
        "proposals": Proposal.objects.count(),
        "community_posts": CommunityPost.objects.count(),
        "comments": Comment.objects.count(),
        "pending_emails": EmailOutbox.objects.filter(status="pending").count(),
    }


class AdminStatsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(_admin_stats())


class AdminOrganizationListView(ListAPIView):
    serializer_class = OrganizationSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = Organization.objects.select_related("owner_user").annotate(
            open_opportunities=Count(
                "opportunities", filter=Q(opportunities__status="open"), distinct=True
            ),
            open_talent_projects=Count(
                "talent_projects", filter=Q(talent_projects__status="open"), distinct=True
            ),
        )
        keyword = self.request.query_params.get("q", "").strip()
        if keyword:
            qs = qs.filter(Q(name__icontains=keyword) | Q(owner_user__name__icontains=keyword))
        verified = self.request.query_params.get("verified")
        if verified in {"0", "1"}:
            qs = qs.filter(is_verified=verified == "1")
        return qs.order_by("name")


class AdminOrganizationDetailView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        organization = get_object_or_404(Organization, pk=pk)
        if "is_verified" in request.data:
            organization.is_verified = bool(request.data["is_verified"])
            organization.save(update_fields=["is_verified", "updated_at"])
        return Response(OrganizationSerializer(organization).data)


class AdminApplicationListView(ListAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = Application.objects.select_related("user", "opportunity", "opportunity__organization")
        status_value = self.request.query_params.get("status")
        if status_value:
            qs = qs.filter(status=status_value)
        keyword = self.request.query_params.get("q", "").strip()
        if keyword:
            qs = qs.filter(Q(user__name__icontains=keyword) | Q(opportunity__title__icontains=keyword))
        return qs.order_by("-created_at")


class AdminTalentListView(ListAPIView):
    serializer_class = PublicProfileSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = Profile.objects.select_related("user").prefetch_related(
            "user__user_skills__skill__category", "user__user_sdgs__sdg"
        )
        keyword = self.request.query_params.get("q", "").strip()
        if keyword:
            qs = qs.filter(
                Q(user__name__icontains=keyword) | Q(professional_title__icontains=keyword)
            )
        return qs.order_by("-updated_at")
