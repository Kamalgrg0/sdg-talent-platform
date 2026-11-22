"""Rule-based skill recommendation engine.

This module intentionally uses transparent rules (co-occurrence and category
affinity) rather than a trained model. The UI must always label the output as
rule-based. Keeping the rules here means a future AI service can replace it.
"""
from collections import defaultdict

from django.db.models import Count

from catalog.models import Skill
from opportunities.models import OpportunitySkill, TalentProjectSkill


def _co_occurrence_scores(selected_ids):
    """Score skills that appear in the same postings as the selected skills."""
    scores = defaultdict(int)
    for model, fk in ((OpportunitySkill, "opportunity_id"), (TalentProjectSkill, "talent_project_id")):
        posting_ids = list(
            model.objects.filter(skill_id__in=selected_ids).values_list(fk, flat=True).distinct()
        )
        if not posting_ids:
            continue
        rows = (
            model.objects.filter(**{f"{fk}__in": posting_ids})
            .exclude(skill_id__in=selected_ids)
            .values("skill_id")
            .annotate(total=Count("skill_id"))
        )
        for row in rows:
            scores[row["skill_id"]] += row["total"]
    return scores


def _category_affinity(selected_ids):
    selected_categories = set(
        Skill.objects.filter(id__in=selected_ids).values_list("category_id", flat=True)
    )
    affinity = {}
    for skill_id, category_id in Skill.objects.values_list("id", "category_id"):
        if category_id in selected_categories:
            affinity[skill_id] = affinity.get(skill_id, 0) + 1
    return affinity


def _popularity_scores():
    scores = defaultdict(int)
    for row in OpportunitySkill.objects.values("skill_id").annotate(total=Count("skill_id")):
        scores[row["skill_id"]] += row["total"] * 2
    for row in TalentProjectSkill.objects.values("skill_id").annotate(total=Count("skill_id")):
        scores[row["skill_id"]] += row["total"]
    return scores


def recommend_for(skill_ids=None, interest="", limit=8):
    skill_ids = skill_ids or []
    interest = (interest or "").strip().lower()

    co = _co_occurrence_scores(skill_ids) if skill_ids else {}
    affinity = _category_affinity(skill_ids) if skill_ids else {}
    popularity = _popularity_scores()

    candidates = {}
    for skill in Skill.objects.select_related("category"):
        if skill.id in skill_ids:
            continue
        score = co.get(skill.id, 0) * 5 + affinity.get(skill.id, 0) * 2 + popularity.get(skill.id, 0)
        reason = ""
        if co.get(skill.id):
            reason = "Often requested alongside your selected skills."
        elif affinity.get(skill.id):
            reason = f"Complements your {skill.category.name.lower()} skills."
        elif popularity.get(skill.id):
            reason = "In demand across current postings."
        if interest:
            haystack = f"{skill.name} {skill.category.name} {skill.description}".lower()
            if interest in haystack:
                score += 10
                reason = f"Matches your interest in “{interest}”."
        candidates[skill.id] = {"skill": skill, "score": score, "reason": reason}

    ordered = sorted(candidates.values(), key=lambda item: (-item["score"], item["skill"].name))
    results = []
    for item in ordered[:limit]:
        skill = item["skill"]
        results.append(
            {
                "id": skill.id,
                "name": skill.name,
                "slug": skill.slug,
                "category": skill.category.name,
                "description": skill.description,
                "reason": item["reason"] or "Popular in the talent pool.",
                "score": item["score"],
            }
        )
    return results
