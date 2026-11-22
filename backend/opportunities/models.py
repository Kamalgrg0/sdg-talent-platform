from django.conf import settings
from django.db import models
from django.db.models import Q

from accounts.models import Organization
from catalog.models import SDG, Skill


class OpportunityType(models.TextChoices):
    JOB = "job", "Job"
    INTERNSHIP = "internship", "Internship"
    FELLOWSHIP = "fellowship", "Fellowship"
    VOLUNTEER = "volunteer", "Volunteer"
    TRAINING = "training", "Training"


class OpportunityStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    OPEN = "open", "Open"
    CLOSED = "closed", "Closed"


class ApplicationStatus(models.TextChoices):
    SUBMITTED = "submitted", "Submitted"
    REVIEWING = "reviewing", "Reviewing"
    SHORTLISTED = "shortlisted", "Shortlisted"
    OFFERED = "offered", "Offer sent"
    ACCEPTED = "accepted", "Offer accepted"
    DECLINED = "declined", "Offer declined"
    REJECTED = "rejected", "Rejected"
    HIRED = "hired", "Hired"


class TalentProjectStatus(models.TextChoices):
    OPEN = "open", "Open"
    CLOSED = "closed", "Closed"


class InvitationStatus(models.TextChoices):
    SENT = "sent", "Sent"
    ACCEPTED = "accepted", "Accepted"
    DECLINED = "declined", "Declined"
    WITHDRAWN = "withdrawn", "Withdrawn"


class Opportunity(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="opportunities")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_opportunities",
        db_column="created_by_user_id",
    )
    sdg = models.ForeignKey(SDG, on_delete=models.SET_NULL, null=True, blank=True, related_name="opportunities")
    title = models.CharField(max_length=180)
    description = models.TextField()
    responsibilities = models.TextField(blank=True)
    requirements = models.TextField(blank=True)
    location = models.CharField(max_length=120)
    type = models.CharField(max_length=20, choices=OpportunityType.choices)
    category = models.CharField(max_length=80, blank=True)
    is_remote = models.BooleanField(default=False)
    deadline = models.DateField()
    status = models.CharField(max_length=10, choices=OpportunityStatus.choices, default=OpportunityStatus.OPEN)
    skills = models.ManyToManyField(Skill, through="OpportunitySkill", related_name="opportunities")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "opportunities"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["status", "deadline"]),
            models.Index(fields=["type"]),
            models.Index(fields=["location"]),
            models.Index(fields=["category"]),
            models.Index(fields=["organization"]),
            models.Index(fields=["sdg"]),
            models.Index(fields=["created_by"]),
        ]

    def __str__(self):
        return self.title

    @property
    def is_open_for_applications(self):
        from django.utils import timezone

        return self.status == OpportunityStatus.OPEN and self.deadline >= timezone.localdate()


class OpportunitySkill(models.Model):
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE)
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "opportunity_skills"
        constraints = [models.UniqueConstraint(fields=["opportunity", "skill"], name="uq_opportunity_skills")]
        indexes = [models.Index(fields=["skill"])]


class Application(models.Model):
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE, related_name="applications")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="applications")
    cover_letter = models.TextField()
    status = models.CharField(max_length=12, choices=ApplicationStatus.choices, default=ApplicationStatus.SUBMITTED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "applications"
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(fields=["opportunity", "user"], name="uq_applications_opportunity_user")
        ]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["opportunity", "status"]),
        ]


class SavedOpportunity(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_opportunities")
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE, related_name="saved_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "saved_opportunities"
        constraints = [models.UniqueConstraint(fields=["user", "opportunity"], name="uq_saved_opportunities")]
        indexes = [models.Index(fields=["opportunity"])]


class TalentProject(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="talent_projects")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_talent_projects",
        db_column="created_by_user_id",
    )
    sdg = models.ForeignKey(SDG, on_delete=models.SET_NULL, null=True, blank=True, related_name="talent_projects")
    title = models.CharField(max_length=180)
    description = models.TextField()
    duration = models.CharField(max_length=60)
    location = models.CharField(max_length=120)
    is_remote = models.BooleanField(default=False)
    talent_required = models.PositiveSmallIntegerField(default=1)
    deadline = models.DateField()
    status = models.CharField(max_length=10, choices=TalentProjectStatus.choices, default=TalentProjectStatus.OPEN)
    skills = models.ManyToManyField(Skill, through="TalentProjectSkill", related_name="talent_projects")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "talent_projects"
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(check=Q(talent_required__gt=0), name="chk_talent_projects_required"),
        ]
        indexes = [
            models.Index(fields=["organization"]),
            models.Index(fields=["status", "deadline"]),
            models.Index(fields=["sdg"]),
        ]

    def __str__(self):
        return self.title


class TalentProjectSkill(models.Model):
    talent_project = models.ForeignKey(TalentProject, on_delete=models.CASCADE)
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "talent_project_skills"
        constraints = [
            models.UniqueConstraint(fields=["talent_project", "skill"], name="uq_talent_project_skills")
        ]
        indexes = [models.Index(fields=["skill"])]


class Invitation(models.Model):
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_invitations",
        db_column="sender_user_id",
    )
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="invitations")
    talent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_invitations",
        db_column="talent_user_id",
    )
    talent_project = models.ForeignKey(
        TalentProject, on_delete=models.CASCADE, null=True, blank=True, related_name="invitations"
    )
    opportunity = models.ForeignKey(
        Opportunity, on_delete=models.CASCADE, null=True, blank=True, related_name="invitations"
    )
    freelance_project = models.ForeignKey(
        "freelance.FreelanceProject", on_delete=models.CASCADE, null=True, blank=True, related_name="invitations"
    )
    message = models.TextField()
    status = models.CharField(max_length=12, choices=InvitationStatus.choices, default=InvitationStatus.SENT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "invitations"
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(check=~Q(sender=models.F("talent")), name="chk_invitations_not_self"),
            models.CheckConstraint(
                check=~(Q(talent_project__isnull=False) & Q(opportunity__isnull=False)),
                name="chk_invitations_target_tp_opp",
            ),
            models.CheckConstraint(
                check=~(Q(talent_project__isnull=False) & Q(freelance_project__isnull=False)),
                name="chk_invitations_target_tp_fp",
            ),
            models.CheckConstraint(
                check=~(Q(opportunity__isnull=False) & Q(freelance_project__isnull=False)),
                name="chk_invitations_target_opp_fp",
            ),
        ]
        indexes = [
            models.Index(fields=["talent", "status"]),
            models.Index(fields=["organization"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["freelance_project"]),
        ]

    def __str__(self):
        return f"Invitation to {self.talent.name}"
