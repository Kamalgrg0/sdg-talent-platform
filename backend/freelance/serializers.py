from rest_framework import serializers

from accounts.serializers import OrganizationSerializer, PublicUserSerializer
from catalog.models import Skill

from .models import FreelanceProject, ProjectSkill, Proposal


class FreelanceProjectListSerializer(serializers.ModelSerializer):
    client = PublicUserSerializer(read_only=True)
    organization = OrganizationSerializer(read_only=True)
    skills = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    proposal_count = serializers.IntegerField(read_only=True, required=False)
    is_open = serializers.SerializerMethodField()
    has_proposed = serializers.SerializerMethodField()

    class Meta:
        model = FreelanceProject
        fields = [
            "id",
            "title",
            "description",
            "client",
            "organization",
            "budget_npr",
            "deadline",
            "duration",
            "status",
            "status_label",
            "skills",
            "proposal_count",
            "is_open",
            "has_proposed",
            "created_at",
        ]

    def get_skills(self, obj):
        return [{"id": s.id, "name": s.name} for s in obj.skills.all()]

    def get_is_open(self, obj):
        from django.utils import timezone

        return obj.status == "open" and obj.deadline >= timezone.localdate()

    def get_has_proposed(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return Proposal.objects.filter(freelance_project=obj, freelancer=request.user).exists()


class FreelanceProjectWriteSerializer(serializers.ModelSerializer):
    skill_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)

    class Meta:
        model = FreelanceProject
        fields = [
            "id",
            "title",
            "description",
            "budget_npr",
            "deadline",
            "duration",
            "status",
            "skill_ids",
        ]

    def validate_skill_ids(self, value):
        if value:
            known = set(Skill.objects.filter(id__in=value).values_list("id", flat=True))
            value = [sid for sid in value if sid in known]
        return list(dict.fromkeys(value))

    def _sync_skills(self, instance, skill_ids):
        ProjectSkill.objects.filter(freelance_project=instance).delete()
        ProjectSkill.objects.bulk_create(
            [ProjectSkill(freelance_project=instance, skill_id=sid) for sid in skill_ids]
        )

    def create(self, validated_data):
        skill_ids = validated_data.pop("skill_ids", [])
        request = self.context["request"]
        instance = FreelanceProject.objects.create(
            client=request.user,
            organization=getattr(request.user, "organization", None),
            **validated_data,
        )
        self._sync_skills(instance, skill_ids)
        return instance

    def update(self, instance, validated_data):
        skill_ids = validated_data.pop("skill_ids", None)
        instance = super().update(instance, validated_data)
        if skill_ids is not None:
            self._sync_skills(instance, skill_ids)
        return instance


class ProposalSerializer(serializers.ModelSerializer):
    freelancer = PublicUserSerializer(read_only=True)
    project_title = serializers.CharField(source="freelance_project.title", read_only=True)
    project_id = serializers.IntegerField(source="freelance_project.id", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Proposal
        fields = [
            "id",
            "freelance_project",
            "project_id",
            "project_title",
            "freelancer",
            "bid_amount",
            "delivery_days",
            "cover_letter",
            "relevant_skills",
            "portfolio_url",
            "status",
            "status_label",
            "created_at",
        ]
        read_only_fields = ["id", "status", "created_at"]


class ProposalCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proposal
        fields = ["bid_amount", "delivery_days", "cover_letter", "relevant_skills", "portfolio_url"]

    def validate_cover_letter(self, value):
        if len(value.strip()) < 20:
            raise serializers.ValidationError("Please write at least 20 characters.")
        return value

    def validate_bid_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("The bid amount must be greater than zero.")
        return value

    def validate_delivery_days(self, value):
        if value <= 0:
            raise serializers.ValidationError("Delivery days must be greater than zero.")
        return value


class ProposalStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proposal
        fields = ["status"]
