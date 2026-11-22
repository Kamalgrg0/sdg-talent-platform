from rest_framework import serializers

from accounts.serializers import OrganizationSerializer, PublicUserSerializer, UserSerializer
from catalog.models import SDG, Skill
from catalog.serializers import SDGSerializer, SkillSerializer

from .models import (
    Application,
    Invitation,
    Opportunity,
    OpportunitySkill,
    SavedOpportunity,
    TalentProject,
    TalentProjectSkill,
)


class OpportunityListSerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer(read_only=True)
    sdg = SDGSerializer(read_only=True)
    type_label = serializers.CharField(source="get_type_display", read_only=True)
    skills = serializers.SerializerMethodField()
    summary = serializers.SerializerMethodField()
    applicant_count = serializers.IntegerField(read_only=True, required=False)
    is_open_for_applications = serializers.BooleanField(read_only=True)
    is_saved = serializers.SerializerMethodField()
    has_applied = serializers.SerializerMethodField()

    class Meta:
        model = Opportunity
        fields = [
            "id",
            "title",
            "organization",
            "sdg",
            "location",
            "type",
            "type_label",
            "category",
            "is_remote",
            "deadline",
            "status",
            "summary",
            "skills",
            "applicant_count",
            "is_open_for_applications",
            "is_saved",
            "has_applied",
            "created_at",
        ]

    def get_skills(self, obj):
        return [{"id": s.id, "name": s.name} for s in obj.skills.all()]

    def get_summary(self, obj):
        text = " ".join((obj.description or "").split())
        if len(text) <= 160:
            return text
        return text[:157].rstrip() + "…"

    def _user(self):
        request = self.context.get("request")
        return request.user if request and request.user.is_authenticated else None

    def get_is_saved(self, obj):
        user = self._user()
        if not user:
            return False
        return SavedOpportunity.objects.filter(user=user, opportunity=obj).exists()

    def get_has_applied(self, obj):
        user = self._user()
        if not user:
            return False
        return Application.objects.filter(user=user, opportunity=obj).exists()


class OpportunityDetailSerializer(OpportunityListSerializer):
    created_by = PublicUserSerializer(read_only=True)
    application_status = serializers.SerializerMethodField()

    class Meta(OpportunityListSerializer.Meta):
        fields = OpportunityListSerializer.Meta.fields + [
            "description",
            "responsibilities",
            "requirements",
            "created_by",
            "application_status",
        ]

    def get_application_status(self, obj):
        user = self._user()
        if not user:
            return None
        application = Application.objects.filter(user=user, opportunity=obj).first()
        return application.status if application else None


class OpportunityWriteSerializer(serializers.ModelSerializer):
    sdg_id = serializers.IntegerField(required=False, allow_null=True)
    skill_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)

    class Meta:
        model = Opportunity
        fields = [
            "id",
            "title",
            "description",
            "responsibilities",
            "requirements",
            "location",
            "type",
            "category",
            "is_remote",
            "deadline",
            "status",
            "sdg_id",
            "skill_ids",
        ]

    def validate_sdg_id(self, value):
        if value in (None, ""):
            return None
        if not SDG.objects.filter(id=value).exists():
            raise serializers.ValidationError("Unknown SDG.")
        return value

    def _sync_skills(self, instance, skill_ids):
        OpportunitySkill.objects.filter(opportunity=instance).delete()
        OpportunitySkill.objects.bulk_create(
            [OpportunitySkill(opportunity=instance, skill_id=sid) for sid in dict.fromkeys(skill_ids)]
        )

    def create(self, validated_data):
        skill_ids = validated_data.pop("skill_ids", [])
        sdg_id = validated_data.pop("sdg_id", None)
        organization = self.context["organization"]
        instance = Opportunity.objects.create(
            organization=organization,
            created_by=self.context["request"].user,
            sdg_id=sdg_id,
            **validated_data,
        )
        self._sync_skills(instance, skill_ids)
        return instance

    def update(self, instance, validated_data):
        skill_ids = validated_data.pop("skill_ids", None)
        sdg_id = validated_data.pop("sdg_id", serializers.empty)
        if sdg_id is not serializers.empty:
            instance.sdg_id = sdg_id
        instance = super().update(instance, validated_data)
        if skill_ids is not None:
            self._sync_skills(instance, skill_ids)
        return instance


class ApplicationSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    opportunity_title = serializers.CharField(source="opportunity.title", read_only=True)
    profile_id = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            "id",
            "opportunity",
            "opportunity_title",
            "user",
            "profile_id",
            "cover_letter",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "user", "status", "created_at"]

    def get_profile_id(self, obj):
        profile = getattr(obj.user, "profile", None)
        return profile.id if profile and profile.is_public else None


class ApplicationCreateSerializer(serializers.Serializer):
    cover_letter = serializers.CharField(min_length=20, max_length=4000)


class ApplicationStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = ["status"]


class TalentProjectSerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer(read_only=True)
    sdg = SDGSerializer(read_only=True)
    skills = serializers.SerializerMethodField()

    class Meta:
        model = TalentProject
        fields = [
            "id",
            "title",
            "description",
            "organization",
            "sdg",
            "duration",
            "location",
            "is_remote",
            "talent_required",
            "deadline",
            "status",
            "skills",
            "created_at",
        ]

    def get_skills(self, obj):
        return [{"id": s.id, "name": s.name} for s in obj.skills.all()]


class TalentProjectWriteSerializer(serializers.ModelSerializer):
    sdg_id = serializers.IntegerField(required=False, allow_null=True)
    skill_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)

    class Meta:
        model = TalentProject
        fields = [
            "id",
            "title",
            "description",
            "duration",
            "location",
            "is_remote",
            "talent_required",
            "deadline",
            "status",
            "sdg_id",
            "skill_ids",
        ]

    def validate_talent_required(self, value):
        if value < 1:
            raise serializers.ValidationError("At least one person is required.")
        return value

    def _sync_skills(self, instance, skill_ids):
        TalentProjectSkill.objects.filter(talent_project=instance).delete()
        TalentProjectSkill.objects.bulk_create(
            [TalentProjectSkill(talent_project=instance, skill_id=sid) for sid in dict.fromkeys(skill_ids)]
        )

    def create(self, validated_data):
        skill_ids = validated_data.pop("skill_ids", [])
        sdg_id = validated_data.pop("sdg_id", None)
        instance = TalentProject.objects.create(
            organization=self.context["organization"],
            created_by=self.context["request"].user,
            sdg_id=sdg_id,
            **validated_data,
        )
        self._sync_skills(instance, skill_ids)
        return instance

    def update(self, instance, validated_data):
        skill_ids = validated_data.pop("skill_ids", None)
        sdg_id = validated_data.pop("sdg_id", serializers.empty)
        if sdg_id is not serializers.empty:
            instance.sdg_id = sdg_id
        instance = super().update(instance, validated_data)
        if skill_ids is not None:
            self._sync_skills(instance, skill_ids)
        return instance


class InvitationSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    talent = UserSerializer(read_only=True)
    organization = OrganizationSerializer(read_only=True)
    target_type = serializers.SerializerMethodField()
    target_title = serializers.SerializerMethodField()

    class Meta:
        model = Invitation
        fields = [
            "id",
            "sender",
            "organization",
            "talent",
            "message",
            "status",
            "talent_project",
            "opportunity",
            "freelance_project",
            "target_type",
            "target_title",
            "created_at",
        ]

    def get_target_type(self, obj):
        if obj.talent_project_id:
            return "talent_project"
        if obj.opportunity_id:
            return "opportunity"
        if obj.freelance_project_id:
            return "freelance_project"
        return "general"

    def get_target_title(self, obj):
        for target in (obj.talent_project, obj.opportunity, obj.freelance_project):
            if target:
                return target.title
        return "General invitation"


class InvitationCreateSerializer(serializers.Serializer):
    talent_id = serializers.IntegerField()
    message = serializers.CharField(min_length=10, max_length=2000)
    talent_project_id = serializers.IntegerField(required=False, allow_null=True)
    opportunity_id = serializers.IntegerField(required=False, allow_null=True)
    freelance_project_id = serializers.IntegerField(required=False, allow_null=True)
