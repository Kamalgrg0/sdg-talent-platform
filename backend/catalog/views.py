from rest_framework.permissions import AllowAny
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from core.recommender import recommend_for

from .models import SDG
from .serializers import SDGSerializer


class SDGListView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = SDGSerializer
    pagination_class = None

    def get_queryset(self):
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
        ).order_by("id")


class RecommendationsView(APIView):
    permission_classes = [AllowAny]
    """Rule-based skill recommendations (explicitly not machine learning)."""

    def get(self, request):
        raw = request.query_params.get("skills", "")
        skill_ids = [int(part) for part in raw.split(",") if part.strip().isdigit()]
        interest = request.query_params.get("interest", "").strip()
        if not skill_ids and request.user.is_authenticated:
            skill_ids = list(
                request.user.user_skills.values_list("skill_id", flat=True)
            )
        results = recommend_for(skill_ids=skill_ids, interest=interest, limit=8)
        return Response(
            {
                "label": "Rule-based suggestions",
                "disclaimer": "These suggestions follow fixed rules, not a trained AI model.",
                "based_on": skill_ids,
                "results": results,
            }
        )
