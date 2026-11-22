from django.db.models import Count, Q
from django.urls import path
from django.utils import timezone
from rest_framework.generics import ListAPIView

from . import views
from .models import SDG, Skill, SkillCategory
from .serializers import SkillCategorySerializer, SkillSerializer


def skill_queryset():
    """Skills annotated with the live counts shown on the skills catalogue."""
    today = timezone.localdate()
    return Skill.objects.select_related("category").annotate(
        open_count=Count(
            "opportunities",
            filter=Q(opportunities__status="open", opportunities__deadline__gte=today),
            distinct=True,
        ),
        talent_count=Count(
            "user_links",
            filter=Q(
                user_links__user__profile__is_public=True,
                user_links__user__status="active",
            ),
            distinct=True,
        ),
    )


def sdg_queryset():
    today = timezone.localdate()
    return SDG.objects.annotate(
        open_count=Count(
            "opportunities",
            filter=Q(opportunities__status="open", opportunities__deadline__gte=today),
            distinct=True,
        ),
        talent_count=Count(
            "user_links",
            filter=Q(
                user_links__user__profile__is_public=True,
                user_links__user__status="active",
            ),
            distinct=True,
        ),
    )


class SkillListView(ListAPIView):
    serializer_class = SkillSerializer
    # The catalogue renders every skill in grouped sections, so it is not paged.
    pagination_class = None

    def get_queryset(self):
        qs = skill_queryset()
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category_id=category)
        keyword = self.request.query_params.get("q", "").strip()
        if keyword:
            qs = qs.filter(name__icontains=keyword)
        return qs.order_by("category__sort_order", "category__name", "name")


class SkillCategoryListView(ListAPIView):
    serializer_class = SkillCategorySerializer
    pagination_class = None

    def get_queryset(self):
        return SkillCategory.objects.annotate(skill_count=Count("skills")).order_by("sort_order", "name")


urlpatterns = [
    path("skills/", SkillListView.as_view(), name="skills"),
    path("skills/categories/", SkillCategoryListView.as_view(), name="skill-categories"),
    path("sdgs/", views.SDGListView.as_view(), name="sdgs"),
    path("recommendations/", views.RecommendationsView.as_view(), name="recommendations"),
]
