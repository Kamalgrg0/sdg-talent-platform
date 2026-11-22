from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.generics import ListCreateAPIView, ListAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from core.links import dashboard_path_for
from core.permissions import IsAdmin, IsEmployerSide, IsTalent
from core.services import notify, queue_email

from .models import (
    Application,
    ApplicationStatus,
    Invitation,
    InvitationStatus,
    Opportunity,
    OpportunityStatus,
    OpportunityType,
    SavedOpportunity,
    TalentProject,
)
from .serializers import (
    ApplicationCreateSerializer,
    ApplicationSerializer,
    ApplicationStatusSerializer,
    InvitationCreateSerializer,
    InvitationSerializer,
    OpportunityDetailSerializer,
    OpportunityListSerializer,
    OpportunityWriteSerializer,
    TalentProjectSerializer,
    TalentProjectWriteSerializer,
)


def filter_opportunities(qs, params):
    keyword = params.get("q", "").strip()
    if keyword:
        qs = qs.filter(
            Q(title__icontains=keyword)
            | Q(description__icontains=keyword)
            | Q(skills__name__icontains=keyword)
        ).distinct()
    location = params.get("location", "").strip()
    if location:
        qs = qs.filter(Q(location__icontains=location) | Q(is_remote=True))
    type_ = params.get("type")
    if type_:
        qs = qs.filter(type=type_)
    category = params.get("category", "").strip()
    if category:
        qs = qs.filter(category__icontains=category)
    skill = params.get("skill")
    if skill:
        qs = qs.filter(skills__id=skill)
    sdg = params.get("sdg")
    if sdg:
        qs = qs.filter(sdg_id=sdg)
    remote = params.get("remote")
    if remote in {"1", "true", "yes"}:
        qs = qs.filter(is_remote=True)
    deadline = params.get("deadline")
    today = timezone.localdate()
    if deadline == "week":
        qs = qs.filter(deadline__lte=today + timezone.timedelta(days=7))
    elif deadline == "month":
        qs = qs.filter(deadline__lte=today + timezone.timedelta(days=30))
    elif deadline and deadline.isdigit():
        # Accept arbitrary day windows such as 7 / 30 / 90 days.
        qs = qs.filter(deadline__lte=today + timezone.timedelta(days=int(deadline)))
    return qs


class OpportunityOptionsView(APIView):
    permission_classes = [AllowAny]
    """Distinct filter choices across the currently open opportunities."""

    def get(self, request):
        today = timezone.localdate()
        open_qs = Opportunity.objects.filter(status="open", deadline__gte=today)
        locations = (
            open_qs.exclude(location="")
            .values("location")
            .annotate(count=Count("id"))
            .order_by("location")
        )
        categories = (
            open_qs.exclude(category="")
            .values("category")
            .annotate(count=Count("id"))
            .order_by("category")
        )
        return Response(
            {
                "locations": [
                    {"value": row["location"], "count": row["count"]} for row in locations
                ],
                "categories": [
                    {"value": row["category"], "count": row["count"]} for row in categories
                ],
                "types": [{"value": value, "label": label} for value, label in OpportunityType.choices],
            }
        )


class OpportunityListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # Listing is public; only employer-side accounts may publish roles.
        if self.request.method == "POST":
            return [IsAuthenticated(), IsEmployerSide()]
        return []

    def get_queryset(self):
        qs = (
            Opportunity.objects.select_related("organization", "sdg", "created_by")
            .prefetch_related("skills")
        )
        params = self.request.query_params
        scope = params.get("scope")
        user = self.request.user
        if scope == "mine":
            if not user.is_authenticated:
                return Opportunity.objects.none()
            return qs.filter(created_by=user).order_by("-created_at")
        status_filter = params.get("status", "open")
        if status_filter and status_filter != "all":
            qs = qs.filter(status=status_filter)
        if status_filter == "all":
            pass
        qs = filter_opportunities(qs, params)
        if status_filter == "open" and not params.get("include_expired"):
            qs = qs.filter(deadline__gte=timezone.localdate())
        return qs.annotate(applicant_count=Count("applications", distinct=True)).order_by("-created_at", "-id")

    def get_serializer_class(self):
        return OpportunityWriteSerializer if self.request.method == "POST" else OpportunityListSerializer

    def create(self, request, *args, **kwargs):
        organization = getattr(request.user, "organization", None)
        if not organization:
            return Response(
                {"detail": "Create your organization profile before posting opportunities."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(data=request.data, context={"request": request, "organization": organization})
        serializer.is_valid(raise_exception=True)
        opportunity = serializer.save()
        return Response(
            OpportunityDetailSerializer(opportunity, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class OpportunityDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticatedOrReadOnly]
    queryset = Opportunity.objects.select_related("organization", "sdg", "created_by").prefetch_related("skills")

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return OpportunityWriteSerializer
        return OpportunityDetailSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["organization"] = getattr(self.request.user, "organization", None)
        return context

    def _can_manage(self, request, opportunity):
        return request.user.is_authenticated and (
            request.user.role == "admin" or opportunity.created_by_id == request.user.id
        )

    def update(self, request, *args, **kwargs):
        opportunity = self.get_object()
        if not self._can_manage(request, opportunity):
            return Response({"detail": "You do not have permission to edit this opportunity."}, status=403)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        opportunity = self.get_object()
        if not self._can_manage(request, opportunity):
            return Response({"detail": "You do not have permission to delete this opportunity."}, status=403)
        return super().destroy(request, *args, **kwargs)


class ApplyView(APIView):
    permission_classes = [IsAuthenticated, IsTalent]

    @transaction.atomic
    def post(self, request, pk):
        opportunity = get_object_or_404(Opportunity.objects.select_related("organization"), pk=pk)
        if not opportunity.is_open_for_applications:
            return Response(
                {"detail": "This opportunity is closed or its deadline has passed."},
                status=status.HTTP_409_CONFLICT,
            )
        serializer = ApplicationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if Application.objects.filter(opportunity=opportunity, user=request.user).exists():
            return Response({"detail": "You have already applied to this opportunity."}, status=409)
        try:
            application = Application.objects.create(
                opportunity=opportunity,
                user=request.user,
                cover_letter=serializer.validated_data["cover_letter"],
            )
        except IntegrityError:
            return Response({"detail": "You have already applied to this opportunity."}, status=409)

        pipeline_link = f"/dashboard/manage-applicants/{opportunity.id}"
        notify(
            opportunity.created_by,
            "new_application",
            "New application received",
            f"{request.user.name} applied for {opportunity.title}.",
            pipeline_link,
        )
        queue_email(
            opportunity.created_by,
            f"New application for {opportunity.title}",
            "new_application",
            {
                "applicant": request.user,
                "opportunity": opportunity,
                "application": application,
                "link": pipeline_link,
            },
        )
        return Response(ApplicationSerializer(application).data, status=status.HTTP_201_CREATED)


class SaveToggleView(APIView):
    permission_classes = [IsAuthenticated, IsTalent]

    def post(self, request, pk):
        opportunity = get_object_or_404(Opportunity, pk=pk)
        saved = SavedOpportunity.objects.filter(user=request.user, opportunity=opportunity)
        if saved.exists():
            saved.delete()
            return Response({"saved": False})
        SavedOpportunity.objects.create(user=request.user, opportunity=opportunity)
        return Response({"saved": True})


class MyApplicationsView(ListAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsTalent]

    def get_queryset(self):
        return (
            Application.objects.filter(user=self.request.user)
            .select_related("opportunity", "opportunity__organization", "user")
            .order_by("-created_at")
        )


class MySavedOpportunitiesView(ListAPIView):
    permission_classes = [IsAuthenticated, IsTalent]
    serializer_class = OpportunityListSerializer

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Opportunity.objects.none()
        ids = SavedOpportunity.objects.filter(user=self.request.user).values_list("opportunity_id", flat=True)
        return (
            Opportunity.objects.filter(id__in=ids)
            .select_related("organization", "sdg")
            .prefetch_related("skills")
            .order_by("-created_at")
        )


class OpportunityApplicantsView(ListAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsEmployerSide]

    def get_queryset(self):
        opportunity = get_object_or_404(Opportunity, pk=self.kwargs["pk"])
        if self.request.user.role != "admin" and opportunity.created_by_id != self.request.user.id:
            return Application.objects.none()
        return Application.objects.filter(opportunity=opportunity).select_related("user", "user__profile").order_by("-created_at")


class ApplicationStatusUpdateView(APIView):
    permission_classes = [IsAuthenticated, IsEmployerSide]

    # Only the employer side moves an application forward. The candidate decides
    # on an offer through ApplicationOfferResponseView.
    ALLOWED_STATUSES = {
        ApplicationStatus.REVIEWING,
        ApplicationStatus.SHORTLISTED,
        ApplicationStatus.OFFERED,
        ApplicationStatus.REJECTED,
    }

    def patch(self, request, pk):
        application = get_object_or_404(Application.objects.select_related("opportunity", "user"), pk=pk)
        opportunity = application.opportunity
        if request.user.role != "admin" and opportunity.created_by_id != request.user.id:
            return Response({"detail": "You do not have permission to update this application."}, status=403)

        new_status = request.data.get("status")
        if new_status not in self.ALLOWED_STATUSES:
            return Response(
                {"detail": "Employers can set reviewing, shortlisted, offer sent, or rejected."},
                status=400,
            )

        previous_status = application.status
        serializer = ApplicationStatusSerializer(application, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        dashboard_link = dashboard_path_for(application.user)

        if application.status == ApplicationStatus.OFFERED and previous_status != ApplicationStatus.OFFERED:
            notify(
                application.user,
                "offer_received",
                "You have a job offer",
                f"{opportunity.organization.name} offered you {opportunity.title}. Accept or decline it from your dashboard.",
                dashboard_link,
            )
            queue_email(
                application.user,
                f"Job offer: {opportunity.title}",
                "offer_received",
                {
                    "application": application,
                    "opportunity": opportunity,
                    "organization": opportunity.organization,
                    "link": dashboard_link,
                },
            )
            return Response(ApplicationSerializer(application).data)

        notify(
            application.user,
            "application_status",
            "Application status updated",
            f"Your application for {opportunity.title} is now {application.get_status_display().lower()}.",
            dashboard_link,
        )
        queue_email(
            application.user,
            f"Update on your application for {opportunity.title}",
            "application_status",
            {"application": application, "opportunity": opportunity, "link": dashboard_link},
        )
        return Response(ApplicationSerializer(application).data)


class ApplicationOfferResponseView(APIView):
    """The candidate accepts or declines an offer sent by the employer."""

    permission_classes = [IsAuthenticated, IsTalent]

    @transaction.atomic
    def post(self, request, pk):
        application = get_object_or_404(
            Application.objects.select_related("opportunity", "opportunity__organization", "user"),
            pk=pk,
        )
        if application.user_id != request.user.id:
            return Response({"detail": "You can only respond to your own offers."}, status=403)
        if application.status != ApplicationStatus.OFFERED:
            return Response(
                {"detail": "There is no open offer on this application."},
                status=status.HTTP_409_CONFLICT,
            )

        action = request.data.get("action")
        if action not in {"accept", "decline"}:
            return Response({"detail": "Choose accept or decline."}, status=400)

        application.status = (
            ApplicationStatus.ACCEPTED if action == "accept" else ApplicationStatus.DECLINED
        )
        application.save(update_fields=["status"])

        opportunity = application.opportunity
        response_word = "accepted" if action == "accept" else "declined"
        pipeline_link = f"/dashboard/manage-applicants/{opportunity.id}"
        notify(
            opportunity.created_by,
            "offer_response",
            f"Offer {response_word}",
            f"{request.user.name} has {response_word} the offer for {opportunity.title}.",
            pipeline_link,
        )
        queue_email(
            opportunity.created_by,
            f"Offer {response_word}: {opportunity.title}",
            "offer_response",
            {
                "application": application,
                "applicant": request.user,
                "opportunity": opportunity,
                "response": response_word,
                "link": pipeline_link,
            },
        )
        return Response(ApplicationSerializer(application).data)



class TalentProjectListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsEmployerSide()]
        return []

    def get_queryset(self):
        qs = TalentProject.objects.select_related("organization", "sdg").prefetch_related("skills")
        status_filter = self.request.query_params.get("status", "open")
        if status_filter and status_filter != "all":
            qs = qs.filter(status=status_filter)
        sdg = self.request.query_params.get("sdg")
        if sdg:
            qs = qs.filter(sdg_id=sdg)
        return qs.order_by("-created_at", "-id")

    def get_serializer_class(self):
        return TalentProjectWriteSerializer if self.request.method == "POST" else TalentProjectSerializer

    def create(self, request, *args, **kwargs):
        organization = getattr(request.user, "organization", None)
        if not organization:
            return Response(
                {"detail": "Create your organization profile before posting talent projects."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(data=request.data, context={"request": request, "organization": organization})
        serializer.is_valid(raise_exception=True)
        project = serializer.save()
        return Response(TalentProjectSerializer(project).data, status=201)


class TalentProjectDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticatedOrReadOnly]
    queryset = TalentProject.objects.select_related("organization", "sdg").prefetch_related("skills")

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return TalentProjectWriteSerializer
        return TalentProjectSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["organization"] = getattr(self.request.user, "organization", None)
        return context

    def _can_manage(self, request, project):
        return request.user.is_authenticated and (
            request.user.role == "admin" or project.created_by_id == request.user.id
        )

    def update(self, request, *args, **kwargs):
        project = self.get_object()
        if not self._can_manage(request, project):
            return Response({"detail": "You do not have permission to edit this project."}, status=403)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        project = self.get_object()
        if not self._can_manage(request, project):
            return Response({"detail": "You do not have permission to delete this project."}, status=403)
        return super().destroy(request, *args, **kwargs)


class InvitationCreateView(APIView):
    permission_classes = [IsAuthenticated, IsEmployerSide]

    @transaction.atomic
    def post(self, request):
        serializer = InvitationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        talent = get_object_or_404(User, pk=data["talent_id"])
        if talent.id == request.user.id:
            return Response({"detail": "You cannot invite yourself."}, status=400)
        organization = getattr(request.user, "organization", None)
        if not organization:
            return Response({"detail": "An organization is required to send invitations."}, status=400)

        targets = [data.get("talent_project_id"), data.get("opportunity_id"), data.get("freelance_project_id")]
        if sum(1 for target in targets if target) > 1:
            return Response({"detail": "Choose at most one project or opportunity."}, status=400)

        invitation = Invitation.objects.create(
            sender=request.user,
            organization=organization,
            talent=talent,
            message=data["message"],
            talent_project_id=data.get("talent_project_id"),
            opportunity_id=data.get("opportunity_id"),
            freelance_project_id=data.get("freelance_project_id"),
        )
        invitation_link = dashboard_path_for(talent)
        notify(
            talent,
            "invitation",
            "New invitation",
            f"{organization.name} invited you to collaborate.",
            invitation_link,
        )
        queue_email(
            talent,
            f"Invitation from {organization.name}",
            "invitation",
            {"invitation": invitation, "organization": organization, "link": invitation_link},
        )
        return Response(InvitationSerializer(invitation).data, status=201)


class InvitationStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        invitation = get_object_or_404(Invitation, pk=pk)
        if request.user.id not in {invitation.talent_id, invitation.sender_id} and request.user.role != "admin":
            return Response({"detail": "You do not have permission to change this invitation."}, status=403)
        new_status = request.data.get("status")
        if new_status not in InvitationStatus.values:
            return Response({"detail": "Unknown invitation status."}, status=400)
        if invitation.talent_id == request.user.id and new_status not in {
            InvitationStatus.ACCEPTED,
            InvitationStatus.DECLINED,
        }:
            return Response({"detail": "You can only accept or decline an invitation."}, status=400)
        invitation.status = new_status
        invitation.save(update_fields=["status", "updated_at"])
        return Response(InvitationSerializer(invitation).data)
