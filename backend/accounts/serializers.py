from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from catalog.models import SDG, Skill, SkillLevel, UserSDG, UserSkill

from .models import Availability, Organization, Profile, Role, User


class UserSerializer(serializers.ModelSerializer):
    is_employer_side = serializers.BooleanField(read_only=True)
    is_talent = serializers.BooleanField(read_only=True)
    has_profile = serializers.SerializerMethodField()
    organization_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "email",
            "role",
            "status",
            "is_employer_side",
            "is_talent",
            "has_profile",
            "organization_id",
            "created_at",
        ]
        read_only_fields = ["id", "role", "status", "created_at"]

    def get_has_profile(self, obj):
        return Profile.objects.filter(user=obj).exists()

    def get_organization_id(self, obj):
        org = getattr(obj, "organization", None)
        return org.id if org else None


class PublicUserSerializer(serializers.ModelSerializer):
    """Safe author/owner representation: never exposes email or phone."""

    class Meta:
        model = User
        fields = ["id", "name", "role"]


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=2, max_length=120)
    email = serializers.EmailField(max_length=190)
    password = serializers.CharField(min_length=8, max_length=72, write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(
        choices=[
            Role.JOB_SEEKER,
            Role.FREELANCER,
            Role.EMPLOYER,
            Role.ORGANIZATION,
        ]
    )
    organization_name = serializers.CharField(max_length=160, required=False, allow_blank=True)

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with that email already exists.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        if attrs["role"] in {Role.EMPLOYER, Role.ORGANIZATION} and not attrs.get("organization_name", "").strip():
            raise serializers.ValidationError({"organization_name": "An organization name is required."})
        validate_password(attrs["password"])
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop("password_confirm")
        org_name = validated_data.pop("organization_name", "").strip()
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        if user.role in {Role.EMPLOYER, Role.ORGANIZATION} and org_name:
            Organization.objects.create(owner_user=user, name=org_name)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            username=attrs["email"].lower(),
            password=attrs["password"],
        )
        if not user:
            raise serializers.ValidationError({"detail": "Incorrect email or password."})
        if user.status != "active":
            raise serializers.ValidationError({"detail": "This account is suspended."})
        attrs["user"] = user
        return attrs


class SkillLinkSerializer(serializers.ModelSerializer):
    skill_id = serializers.IntegerField(source="skill.id")
    name = serializers.CharField(source="skill.name")
    slug = serializers.CharField(source="skill.slug")
    category = serializers.CharField(source="skill.category.name")

    class Meta:
        model = UserSkill
        fields = ["skill_id", "name", "slug", "category", "level"]


class SDGSerializer(serializers.ModelSerializer):
    class Meta:
        model = SDG
        fields = ["id", "code", "name", "description", "color_hex"]


class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    skills = SkillLinkSerializer(source="user.user_skills", many=True, read_only=True)
    sdgs = serializers.SerializerMethodField()
    email = serializers.EmailField(source="user.email", read_only=True)
    name = serializers.CharField(source="user.name", read_only=True)
    skill_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    skill_levels = serializers.DictField(
        child=serializers.ChoiceField(choices=SkillLevel.choices),
        write_only=True,
        required=False,
    )
    sdg_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)

    class Meta:
        model = Profile
        fields = [
            "id",
            "user",
            "name",
            "email",
            "phone",
            "location",
            "professional_title",
            "bio",
            "education",
            "experience",
            "availability",
            "portfolio_url",
            "linkedin_url",
            "is_public",
            "skills",
            "sdgs",
            "skill_ids",
            "skill_levels",
            "sdg_ids",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]

    def get_sdgs(self, obj):
        links = UserSDG.objects.filter(user=obj.user).select_related("sdg")
        return [SDGSerializer(link.sdg).data for link in links]

    def validate_skill_ids(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Duplicate skills are not allowed.")
        if len(value) > 15:
            raise serializers.ValidationError("Choose no more than 15 skills.")
        known = set(Skill.objects.filter(id__in=value).values_list("id", flat=True))
        unknown = [sid for sid in value if sid not in known]
        if unknown:
            raise serializers.ValidationError("One or more selected skills no longer exist.")
        return value

    def validate_sdg_ids(self, value):
        value = list(dict.fromkeys(value))
        if len(value) > settings.MAX_USER_SDGS:
            raise serializers.ValidationError(
                f"You can select up to {settings.MAX_USER_SDGS} SDG priorities."
            )
        known = set(SDG.objects.filter(id__in=value).values_list("id", flat=True))
        if any(sid not in known for sid in value):
            raise serializers.ValidationError("One or more selected goals no longer exist.")
        return value

    @staticmethod
    def _sync_skills(user, skill_ids, skill_levels=None):
        levels = {str(key): value for key, value in (skill_levels or {}).items()}
        UserSkill.objects.filter(user=user).delete()
        UserSkill.objects.bulk_create(
            [
                UserSkill(
                    user=user,
                    skill_id=sid,
                    level=levels.get(str(sid), SkillLevel.BEGINNER),
                )
                for sid in skill_ids
            ]
        )

    @transaction.atomic
    def update(self, instance, validated_data):
        skill_ids = validated_data.pop("skill_ids", None)
        skill_levels = validated_data.pop("skill_levels", None)
        sdg_ids = validated_data.pop("sdg_ids", None)
        instance = super().update(instance, validated_data)
        if skill_ids is not None:
            self._sync_skills(instance.user, skill_ids, skill_levels)
        elif skill_levels:
            levels = {str(key): value for key, value in skill_levels.items()}
            for link in UserSkill.objects.filter(user=instance.user):
                if str(link.skill_id) in levels:
                    link.level = levels[str(link.skill_id)]
                    link.save(update_fields=["level"])
        if sdg_ids is not None:
            UserSDG.objects.filter(user=instance.user).delete()
            UserSDG.objects.bulk_create([UserSDG(user=instance.user, sdg_id=sid) for sid in sdg_ids])
        return instance


class ProfileCreateSerializer(ProfileSerializer):
    @transaction.atomic
    def create(self, validated_data):
        skill_ids = validated_data.pop("skill_ids", [])
        skill_levels = validated_data.pop("skill_levels", None)
        sdg_ids = validated_data.pop("sdg_ids", [])
        request = self.context.get("request")
        if request is None:
            raise serializers.ValidationError("The account for this profile could not be determined.")
        user = request.user
        profile = Profile.objects.create(user=user, **validated_data)
        self._sync_skills(user, skill_ids, skill_levels)
        UserSDG.objects.bulk_create([UserSDG(user=user, sdg_id=sid) for sid in sdg_ids])
        return profile


class PublicProfileSerializer(serializers.ModelSerializer):
    """Profile fields safe to render publicly. Email and phone are excluded."""

    user = PublicUserSerializer(read_only=True)
    name = serializers.CharField(source="user.name", read_only=True)
    skills = SkillLinkSerializer(source="user.user_skills", many=True, read_only=True)
    sdgs = serializers.SerializerMethodField()
    member_since = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            "id",
            "user",
            "name",
            "location",
            "professional_title",
            "bio",
            "education",
            "experience",
            "availability",
            "portfolio_url",
            "linkedin_url",
            "is_public",
            "skills",
            "sdgs",
            "member_since",
            "updated_at",
        ]

    def get_sdgs(self, obj):
        links = UserSDG.objects.filter(user=obj.user).select_related("sdg")
        return [SDGSerializer(link.sdg).data for link in links]

    def get_member_since(self, obj):
        return obj.user.created_at.date().isoformat()


class OrganizationSerializer(serializers.ModelSerializer):
    owner = PublicUserSerializer(source="owner_user", read_only=True)
    open_opportunities = serializers.IntegerField(read_only=True, required=False)
    open_talent_projects = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "website",
            "location",
            "contact_email",
            "is_verified",
            "owner",
            "open_opportunities",
            "open_talent_projects",
            "created_at",
        ]
        read_only_fields = ["id", "slug", "is_verified", "created_at"]


class AdminUserSerializer(serializers.ModelSerializer):
    profile_title = serializers.SerializerMethodField()
    organization_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "email",
            "role",
            "status",
            "profile_title",
            "organization_name",
            "created_at",
        ]

    def get_profile_title(self, obj):
        profile = getattr(obj, "profile", None)
        return profile.professional_title if profile else ""

    def get_organization_name(self, obj):
        org = getattr(obj, "organization", None)
        return org.name if org else ""
