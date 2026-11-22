from rest_framework import serializers

from .models import SDG, Skill, SkillCategory, UserSkill


class SkillCategorySerializer(serializers.ModelSerializer):
    skill_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = SkillCategory
        fields = ["id", "name", "slug", "description", "sort_order", "skill_count"]


class SkillSerializer(serializers.ModelSerializer):
    category_id = serializers.IntegerField(source="category.id", read_only=True)
    category = serializers.CharField(source="category.name", read_only=True)
    open_count = serializers.IntegerField(read_only=True, required=False, default=0)
    talent_count = serializers.IntegerField(read_only=True, required=False, default=0)

    class Meta:
        model = Skill
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "category_id",
            "category",
            "open_count",
            "talent_count",
        ]


class SDGSerializer(serializers.ModelSerializer):
    open_count = serializers.IntegerField(read_only=True, required=False, default=0)
    talent_count = serializers.IntegerField(read_only=True, required=False, default=0)

    class Meta:
        model = SDG
        fields = ["id", "code", "name", "description", "color_hex", "open_count", "talent_count"]


class UserSkillSerializer(serializers.ModelSerializer):
    skill_id = serializers.IntegerField(source="skill.id")
    name = serializers.CharField(source="skill.name")
    category = serializers.CharField(source="skill.category.name")

    class Meta:
        model = UserSkill
        fields = ["skill_id", "name", "category", "level"]
