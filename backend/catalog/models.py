from django.conf import settings
from django.db import models


class SkillCategory(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=80, unique=True)
    description = models.CharField(max_length=255, blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "skill_categories"
        ordering = ["sort_order", "name"]
        verbose_name_plural = "skill categories"

    def __str__(self):
        return self.name


class Skill(models.Model):
    category = models.ForeignKey(SkillCategory, on_delete=models.PROTECT, related_name="skills")
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "skills"
        ordering = ["name"]
        indexes = [models.Index(fields=["category"])]

    def __str__(self):
        return self.name


class SDG(models.Model):
    id = models.SmallIntegerField(primary_key=True)
    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    color_hex = models.CharField(max_length=7, default="#164A8A")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "sdgs"
        ordering = ["id"]
        verbose_name = "SDG"
        verbose_name_plural = "SDGs"

    def __str__(self):
        return f"{self.code} {self.name}"


class SkillLevel(models.TextChoices):
    BEGINNER = "beginner", "Beginner"
    INTERMEDIATE = "intermediate", "Intermediate"
    ADVANCED = "advanced", "Advanced"
    EXPERT = "expert", "Expert"


class UserSkill(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_skills")
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name="user_links")
    level = models.CharField(max_length=12, choices=SkillLevel.choices, default=SkillLevel.BEGINNER)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "user_skills"
        constraints = [models.UniqueConstraint(fields=["user", "skill"], name="uq_user_skills")]
        indexes = [models.Index(fields=["skill"])]

    def __str__(self):
        return f"{self.user.name} — {self.skill.name}"


class UserSDG(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_sdgs")
    sdg = models.ForeignKey(SDG, on_delete=models.CASCADE, related_name="user_links")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "user_sdgs"
        constraints = [models.UniqueConstraint(fields=["user", "sdg"], name="uq_user_sdgs")]
        indexes = [models.Index(fields=["sdg"])]

    def __str__(self):
        return f"{self.user.name} — {self.sdg.code}"
