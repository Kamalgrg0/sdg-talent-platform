from django.conf import settings
from django.db import models
from django.db.models import Q

from accounts.models import Organization
from catalog.models import Skill


class FreelanceStatus(models.TextChoices):
    OPEN = "open", "Open"
    IN_PROGRESS = "in_progress", "In progress"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class ProposalStatus(models.TextChoices):
    SUBMITTED = "submitted", "Submitted"
    SHORTLISTED = "shortlisted", "Shortlisted"
    ACCEPTED = "accepted", "Accepted"
    REJECTED = "rejected", "Rejected"
    WITHDRAWN = "withdrawn", "Withdrawn"


class FreelanceProject(models.Model):
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="freelance_projects",
        db_column="client_user_id",
    )
    organization = models.ForeignKey(
        Organization, on_delete=models.SET_NULL, null=True, blank=True, related_name="freelance_projects"
    )
    title = models.CharField(max_length=180)
    description = models.TextField()
    budget_npr = models.DecimalField(max_digits=12, decimal_places=2)
    deadline = models.DateField()
    duration = models.CharField(max_length=60)
    status = models.CharField(max_length=12, choices=FreelanceStatus.choices, default=FreelanceStatus.OPEN)
    skills = models.ManyToManyField(Skill, through="ProjectSkill", related_name="freelance_projects")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "freelance_projects"
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(check=Q(budget_npr__gt=0), name="chk_freelance_projects_budget"),
        ]
        indexes = [
            models.Index(fields=["client"]),
            models.Index(fields=["status", "deadline"]),
            models.Index(fields=["budget_npr"]),
            models.Index(fields=["organization"]),
        ]

    def __str__(self):
        return self.title


class ProjectSkill(models.Model):
    freelance_project = models.ForeignKey(FreelanceProject, on_delete=models.CASCADE)
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "project_skills"
        constraints = [
            models.UniqueConstraint(fields=["freelance_project", "skill"], name="uq_project_skills")
        ]
        indexes = [models.Index(fields=["skill"])]


class Proposal(models.Model):
    freelance_project = models.ForeignKey(
        FreelanceProject, on_delete=models.CASCADE, related_name="proposals"
    )
    freelancer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="proposals",
        db_column="freelancer_user_id",
    )
    bid_amount = models.DecimalField(max_digits=12, decimal_places=2)
    delivery_days = models.PositiveSmallIntegerField()
    cover_letter = models.TextField()
    relevant_skills = models.CharField(max_length=255)
    portfolio_url = models.URLField(max_length=255, blank=True)
    status = models.CharField(max_length=12, choices=ProposalStatus.choices, default=ProposalStatus.SUBMITTED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "proposals"
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["freelance_project", "freelancer"], name="uq_proposals_project_freelancer"
            ),
            models.CheckConstraint(check=Q(bid_amount__gt=0), name="chk_proposals_bid"),
            models.CheckConstraint(check=Q(delivery_days__gt=0), name="chk_proposals_delivery"),
        ]
        indexes = [
            models.Index(fields=["freelancer", "status"]),
            models.Index(fields=["freelance_project", "status"]),
        ]
