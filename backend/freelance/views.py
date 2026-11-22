from django.db import IntegrityError, transaction
from django.db.models import Count, Max, Min, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.generics import ListAPIView, ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Skill
from core.permissions import IsEmployerSide
from core.services import notify, queue_email

from .models import FreelanceProject, Proposal, ProposalStatus
from .serializers import (
    FreelanceProjectListSerializer,
    FreelanceProjectWriteSerializer,
    ProposalCreateSerializer,
    ProposalSerializer,
    ProposalStatusSerializer,
)


def filter_projects(qs, params):
    keyword = params.get("q", "").strip()
    if keyword:
        qs = qs.filter(
            Q(title__icontains=keyword)
            | Q(description__icontains=keyword)
            | Q(skills__name__icontains=keyword)
        ).distinct()
    skill = params.get("skill")
    if skill:
        qs = qs.filter(skills__id=skill)
    budget = params.get("budget")
    if budget == "under-50000":
        qs = qs.filter(budget_npr__lt=50000)
    elif budget == "50000-100000":
        qs = qs.filter(budget_npr__gte=50000, budget_npr__lte=100000)
    elif budget == "over-100000":
        qs = qs.filter(budget_npr__gt=100000)
    # Also accept free-form numeric budget bounds.
    budget_min = params.get("budget_min", "").strip()
    if budget_min.isdigit():
        qs = qs.filter(budget_npr__gte=int(budget_min))
    budget_max = params.get("budget_max", "").strip()
    if budget_max.isdigit():
        qs = qs.filter(budget_npr__lte=int(budget_max))
    return qs


class FreelanceOptionsView(APIView):
    permission_classes = [AllowAny]
    """Filter options for the freelance board (open projects only)."""

    def get(self, request):
        today = timezone.localdate()
        open_projects = FreelanceProject.objects.filter(status="open", deadline__gte=today)
        aggregates = open_projects.aggregate(
            min_budget=Min("budget_npr"), max_budget=Max("budget_npr")
        )
        skills = (
            Skill.objects.filter(freelance_projects__in=open_projects)
            .annotate(open_count=Count("freelance_projects", distinct=True))
            .order_by("name")
        )
        return Response(
            {
                "min_budget": aggregates["min_budget"],
                "max_budget": aggregates["max_budget"],
                "skills": [
                    {"id": skill.id, "name": skill.name, "open_count": skill.open_count}
                    for skill in skills
                ],
            }
        )


class FreelanceProjectListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsEmployerSide()]
        return []

    def get_queryset(self):
        qs = (
            FreelanceProject.objects.select_related("client", "organization")
            .prefetch_related("skills")
            .annotate(proposal_count=Count("proposals", distinct=True))
        )
        params = self.request.query_params
        if params.get("scope") == "mine":
            if not self.request.user.is_authenticated:
                return FreelanceProject.objects.none()
            return qs.filter(client=self.request.user).order_by("-created_at")
        status_filter = params.get("status", "open")
        if status_filter and status_filter != "all":
            qs = qs.filter(status=status_filter)
        qs = filter_projects(qs, params)
        if status_filter == "open":
            qs = qs.filter(deadline__gte=timezone.localdate())
        return qs.order_by("-created_at", "-id")

    def get_serializer_class(self):
        return FreelanceProjectWriteSerializer if self.request.method == "POST" else FreelanceProjectListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        project = serializer.save()
        return Response(
            FreelanceProjectListSerializer(project, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class FreelanceProjectDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticatedOrReadOnly]
    queryset = FreelanceProject.objects.select_related("client", "organization").prefetch_related("skills")

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return FreelanceProjectWriteSerializer
        return FreelanceProjectListSerializer

    def _can_manage(self, request, project):
        return request.user.is_authenticated and (
            request.user.role == "admin" or project.client_id == request.user.id
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


class ProposalSubmitView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        if request.user.role != "freelancer":
            return Response({"detail": "Only freelancer accounts can submit proposals."}, status=403)
        project = get_object_or_404(FreelanceProject, pk=pk)
        if project.status != "open" or project.deadline < timezone.localdate():
            return Response({"detail": "This project is not accepting proposals."}, status=409)
        if Proposal.objects.filter(freelance_project=project, freelancer=request.user).exists():
            return Response({"detail": "You have already submitted a proposal for this project."}, status=409)
        serializer = ProposalCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            proposal = Proposal.objects.create(freelance_project=project, freelancer=request.user, **serializer.validated_data)
        except IntegrityError:
            return Response({"detail": "You have already submitted a proposal for this project."}, status=409)

        # The client reviews bids in the management panel on the project page.
        proposal_link = f"/freelance/{project.id}"
        notify(
            project.client,
            "new_proposal",
            "New proposal received",
            f"{request.user.name} submitted a proposal for {project.title}.",
            proposal_link,
        )
        queue_email(
            project.client,
            f"New proposal for {project.title}",
            "new_proposal",
            {
                "proposal": proposal,
                "project": project,
                "freelancer": request.user,
                "link": proposal_link,
            },
        )
        return Response(ProposalSerializer(proposal).data, status=status.HTTP_201_CREATED)


class MyProposalsView(ListAPIView):
    serializer_class = ProposalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role != "freelancer":
            return Proposal.objects.none()
        return (
            Proposal.objects.filter(freelancer=self.request.user)
            .select_related("freelance_project", "freelancer")
            .order_by("-created_at")
        )


class ProjectProposalsView(ListAPIView):
    serializer_class = ProposalSerializer
    permission_classes = [IsAuthenticated, IsEmployerSide]

    def get_queryset(self):
        project = get_object_or_404(FreelanceProject, pk=self.kwargs["pk"])
        if self.request.user.role != "admin" and project.client_id != self.request.user.id:
            return Proposal.objects.none()
        return (
            Proposal.objects.filter(freelance_project=project)
            .select_related("freelancer", "freelance_project")
            .order_by("-created_at")
        )


class ProposalStatusUpdateView(APIView):
    permission_classes = [IsAuthenticated, IsEmployerSide]

    def patch(self, request, pk):
        proposal = get_object_or_404(
            Proposal.objects.select_related("freelance_project", "freelancer"), pk=pk
        )
        project = proposal.freelance_project
        if request.user.role != "admin" and project.client_id != request.user.id:
            return Response({"detail": "You do not have permission to update this proposal."}, status=403)
        serializer = ProposalStatusSerializer(proposal, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        dashboard_link = "/dashboard/freelancer"
        notify(
            proposal.freelancer,
            "proposal_status",
            "Proposal status updated",
            f"Your proposal for {project.title} is now {proposal.get_status_display().lower()}.",
            dashboard_link,
        )
        queue_email(
            proposal.freelancer,
            f"Update on your proposal for {project.title}",
            "proposal_status",
            {"proposal": proposal, "project": project, "link": dashboard_link},
        )
        return Response(ProposalSerializer(proposal).data)


class ProposalWithdrawView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        proposal = get_object_or_404(Proposal, pk=pk)
        if proposal.freelancer_id != request.user.id and request.user.role != "admin":
            return Response({"detail": "You do not have permission to withdraw this proposal."}, status=403)
        if proposal.status in {ProposalStatus.ACCEPTED, ProposalStatus.WITHDRAWN}:
            return Response({"detail": "This proposal can no longer be withdrawn."}, status=400)
        proposal.status = ProposalStatus.WITHDRAWN
        proposal.save(update_fields=["status", "updated_at"])
        return Response(ProposalSerializer(proposal).data)
