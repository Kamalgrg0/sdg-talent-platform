
from django.contrib import admin
from django.apps import apps
from django.contrib.auth import get_user_model

User = get_user_model()

TALENTBRIDGE_APPS = [
    "accounts",
    "catalog",
    "opportunities",
    "freelance",
    "community",
    "notifications",
    "messaging",
    "core",
]


# ==================================
# ACCOUNTS ADMIN
# ==================================

class TalentBridgeUserAdmin(admin.ModelAdmin):
    list_display = (
        "id", "email", "name", "role",
        "status", "is_active", "is_superuser",
    )
    search_fields = ("email", "name")
    list_filter = ("role", "status", "is_active")
    ordering = ("-id",)
    list_per_page = 25
    show_full_result_count = False

    exclude = ("password", "groups", "user_permissions")
    readonly_fields = (
        "id", "role", "status", "is_active", "is_superuser",
    )

    def has_add_permission(self, request):
        return False


class TalentBridgeProfileAdmin(admin.ModelAdmin):
    list_display = (
        "id", "user", "professional_title",
        "location", "availability", "is_public",
    )
    search_fields = (
        "user__email", "user__name",
        "professional_title", "location",
    )
    list_filter = ("availability", "is_public")
    ordering = ("-id",)
    list_per_page = 25
    list_select_related = ("user",)
    readonly_fields = ("user",)

    def has_add_permission(self, request):
        return False


class TalentBridgeOrganizationAdmin(admin.ModelAdmin):
    list_display = (
        "id", "name", "owner_user",
        "location", "is_verified",
    )
    search_fields = (
        "name", "owner_user__email", "location",
    )
    list_filter = ("is_verified",)
    ordering = ("-id",)
    list_per_page = 25
    list_select_related = ("owner_user",)
    readonly_fields = ("owner_user", "is_verified")

    def has_add_permission(self, request):
        return False


# ==================================
# CATALOG ADMIN
# ==================================

class SkillCategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)
    ordering = ("name",)
    list_per_page = 25


class SkillAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "category")
    search_fields = ("name", "category__name")
    list_filter = ("category",)
    list_select_related = ("category",)
    ordering = ("name",)
    list_per_page = 25


class SDGAdmin(admin.ModelAdmin):
    list_display = ("id", "code", "name")
    search_fields = ("code", "name")
    ordering = ("code",)
    list_per_page = 25


class UserSkillAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "skill", "level")
    search_fields = (
        "user__email", "user__name", "skill__name",
    )
    list_filter = ("level",)
    list_select_related = ("user", "skill")
    ordering = ("-id",)
    list_per_page = 25


class UserSDGAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "sdg")
    search_fields = (
        "user__email", "user__name", "sdg__name",
    )
    list_select_related = ("user", "sdg")
    ordering = ("-id",)
    list_per_page = 25


# ==================================
# OPPORTUNITIES ADMIN
# ==================================

class OpportunityAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "organization",
        "type",
        "location",
        "is_remote",
        "deadline",
        "status",
    )
    search_fields = (
        "title",
        "organization__name",
        "created_by__email",
        "location",
    )
    list_filter = (
        "status", "type", "is_remote", "deadline",
    )
    list_select_related = ("organization", "created_by")
    readonly_fields = (
        "created_by", "created_at", "updated_at",
    )
    ordering = ("-created_at",)
    list_per_page = 25

    def has_add_permission(self, request):
        return False


class OpportunitySkillAdmin(admin.ModelAdmin):
    list_display = (
        "id", "opportunity", "skill", "created_at",
    )
    search_fields = (
        "opportunity__title", "skill__name",
    )
    list_select_related = ("opportunity", "skill")
    readonly_fields = ("created_at",)
    ordering = ("-id",)
    list_per_page = 25


class ApplicationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "opportunity",
        "user",
        "status",
        "created_at",
    )
    search_fields = (
        "opportunity__title",
        "user__email",
        "user__name",
    )
    list_filter = ("status", "created_at")
    list_select_related = ("opportunity", "user")
    readonly_fields = (
        "opportunity",
        "user",
        "created_at",
        "updated_at",
    )
    ordering = ("-created_at",)
    list_per_page = 25

    def has_add_permission(self, request):
        return False


class SavedOpportunityAdmin(admin.ModelAdmin):
    list_display = (
        "id", "user", "opportunity", "created_at",
    )
    search_fields = (
        "user__email", "opportunity__title",
    )
    list_select_related = ("user", "opportunity")
    readonly_fields = (
        "user", "opportunity", "created_at",
    )
    ordering = ("-created_at",)
    list_per_page = 25

    def has_add_permission(self, request):
        return False


class TalentProjectAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "organization",
        "location",
        "is_remote",
        "talent_required",
        "deadline",
        "status",
    )
    search_fields = (
        "title",
        "organization__name",
        "created_by__email",
        "location",
    )
    list_filter = (
        "status", "is_remote", "deadline",
    )
    list_select_related = ("organization", "created_by")
    readonly_fields = (
        "created_by", "created_at", "updated_at",
    )
    ordering = ("-created_at",)
    list_per_page = 25

    def has_add_permission(self, request):
        return False


class TalentProjectSkillAdmin(admin.ModelAdmin):
    list_display = (
        "id", "talent_project", "skill", "created_at",
    )
    search_fields = (
        "talent_project__title", "skill__name",
    )
    list_select_related = ("talent_project", "skill")
    readonly_fields = ("created_at",)
    ordering = ("-id",)
    list_per_page = 25


class InvitationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "sender",
        "talent",
        "organization",
        "status",
        "created_at",
    )
    search_fields = (
        "sender__email",
        "talent__email",
        "organization__name",
    )
    list_filter = ("status", "created_at")
    list_select_related = (
        "sender", "talent", "organization",
    )
    readonly_fields = (
        "sender",
        "talent",
        "organization",
        "opportunity",
        "talent_project",
        "freelance_project",
        "created_at",
        "updated_at",
    )
    ordering = ("-created_at",)
    list_per_page = 25

    def has_add_permission(self, request):
        return False


# ==================================
# FREELANCE ADMIN
# ==================================

class FreelanceProjectAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "client",
        "organization",
        "budget_npr",
        "deadline",
        "duration",
        "status",
        "created_at",
    )
    search_fields = (
        "title",
        "client__email",
        "client__name",
        "organization__name",
    )
    list_filter = (
        "status",
        "deadline",
        "created_at",
    )
    list_select_related = ("client", "organization")
    ordering = ("-created_at",)
    list_per_page = 25
    readonly_fields = (
        "client",
        "organization",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False


class ProjectSkillAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "freelance_project",
        "skill",
        "created_at",
    )
    search_fields = (
        "freelance_project__title",
        "skill__name",
    )
    list_select_related = (
        "freelance_project",
        "skill",
    )
    ordering = ("-id",)
    list_per_page = 25
    readonly_fields = (
        "freelance_project",
        "skill",
        "created_at",
    )

    def has_add_permission(self, request):
        return False


class ProposalAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "freelance_project",
        "freelancer",
        "bid_amount",
        "delivery_days",
        "status",
        "created_at",
    )
    search_fields = (
        "freelance_project__title",
        "freelancer__email",
        "freelancer__name",
    )
    list_filter = (
        "status",
        "created_at",
    )
    list_select_related = (
        "freelance_project",
        "freelancer",
    )
    ordering = ("-created_at",)
    list_per_page = 25
    readonly_fields = (
        "freelance_project",
        "freelancer",
        "bid_amount",
        "delivery_days",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False


# ==================================
# COMMUNITY ADMIN
# ==================================

class CommunityPostAdmin(admin.ModelAdmin):
    list_display = (
        "id", "title", "user", "type", "status",
        "event_date", "created_at",
    )
    search_fields = ("title", "body", "user__email", "user__name")
    list_filter = ("type", "status", "created_at")
    list_select_related = ("user",)
    ordering = ("-created_at",)
    list_per_page = 25
    readonly_fields = ("user", "created_at", "updated_at")

    # Keep bulk actions, including bulk deletion, disabled.
    actions = None

    # Only superusers can create community posts in Django Admin.
    def has_add_permission(self, request):
        return request.user.is_superuser

    # Only superusers can delete individual community posts.
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    # The post author is read-only, so populate it for newly created posts.
    def save_model(self, request, obj, form, change):
        if not change:
            obj.user = request.user
        super().save_model(request, obj, form, change)


class CommentAdmin(admin.ModelAdmin):
    list_display = ("id", "post", "user", "status", "created_at")
    search_fields = ("post__title", "body", "user__email", "user__name")
    list_filter = ("status", "created_at")
    list_select_related = ("post", "user")
    ordering = ("-created_at",)
    list_per_page = 25
    readonly_fields = ("post", "user", "created_at", "updated_at")
    actions = None

    def has_add_permission(self, request):
        return False



# ==================================
# NOTIFICATIONS ADMIN
# ==================================

class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "type",
        "title",
        "is_read",
        "created_at",
    )

    search_fields = (
        "user__email",
        "user__name",
        "type",
        "title",
        "message",
    )

    list_filter = (
        "type",
        "is_read",
        "created_at",
    )

    list_select_related = ("user",)
    ordering = ("-created_at",)
    list_per_page = 25

    readonly_fields = (
        "user",
        "type",
        "title",
        "message",
        "link",
        "is_read",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class EmailOutboxAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "recipient_email",
        "subject",
        "status",
        "attempts",
        "created_at",
        "sent_at",
    )

    search_fields = (
        "recipient_email",
        "recipient_name",
        "subject",
    )

    list_filter = (
        "status",
        "created_at",
        "sent_at",
    )

    ordering = ("-created_at",)
    list_per_page = 25

    readonly_fields = (
        "user",
        "recipient_email",
        "recipient_name",
        "subject",
        "body_html",
        "body_text",
        "status",
        "attempts",
        "last_error",
        "created_at",
        "sent_at",
    )

    # Outbox entries should be managed by the email service,
    # not manually created or modified in Django Admin.
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False




# ==================================
# MESSAGING ADMIN
# ==================================

class ConversationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user_a",
        "user_b",
        "subject",
        "last_message_at",
        "created_at",
    )

    search_fields = (
        "user_a__email",
        "user_a__name",
        "user_b__email",
        "user_b__name",
        "subject",
    )

    list_filter = (
        "created_at",
        "last_message_at",
    )

    list_select_related = (
        "user_a",
        "user_b",
    )

    ordering = ("-updated_at",)
    list_per_page = 25

    readonly_fields = (
        "user_a",
        "user_b",
        "subject",
        "last_message_at",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class MessageAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "conversation",
        "sender",
        "message_preview",
        "read_at",
        "created_at",
    )

    search_fields = (
        "sender__email",
        "sender__name",
        "body",
    )

    list_filter = (
        "created_at",
        "read_at",
    )

    list_select_related = (
        "conversation",
        "sender",
    )

    ordering = ("-created_at",)
    list_per_page = 25

    readonly_fields = (
        "conversation",
        "sender",
        "body",
        "read_at",
        "created_at",
    )

    @admin.display(description="Message preview")
    def message_preview(self, obj):
        return obj.body[:70] + ("..." if len(obj.body) > 70 else "")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False



# ==================================
# CUSTOM MODEL ADMIN REGISTRATION
# ==================================

CUSTOM_ADMIN_CLASSES = {
    # Accounts
    "accounts.User": TalentBridgeUserAdmin,
    "accounts.Profile": TalentBridgeProfileAdmin,
    "accounts.Organization": TalentBridgeOrganizationAdmin,

    # Catalog
    "catalog.SkillCategory": SkillCategoryAdmin,
    "catalog.Skill": SkillAdmin,
    "catalog.SDG": SDGAdmin,
    "catalog.UserSkill": UserSkillAdmin,
    "catalog.UserSDG": UserSDGAdmin,

    # Opportunities
    "opportunities.Opportunity": OpportunityAdmin,
    "opportunities.OpportunitySkill": OpportunitySkillAdmin,
    "opportunities.Application": ApplicationAdmin,
    "opportunities.SavedOpportunity": SavedOpportunityAdmin,
    "opportunities.TalentProject": TalentProjectAdmin,
    "opportunities.TalentProjectSkill": TalentProjectSkillAdmin,
    "opportunities.Invitation": InvitationAdmin,

    # Freelance
    "freelance.FreelanceProject": FreelanceProjectAdmin,
    "freelance.ProjectSkill": ProjectSkillAdmin,
    "freelance.Proposal": ProposalAdmin,

    # Community
    "community.CommunityPost": CommunityPostAdmin,
    "community.Comment": CommentAdmin,

     # Notifications
    "notifications.Notification": NotificationAdmin,
    "notifications.EmailOutbox": EmailOutboxAdmin,

     # Messaging
    "messaging.Conversation": ConversationAdmin,
    "messaging.Message": MessageAdmin,
}


# ==================================
# REGISTER ALL TALENTBRIDGE MODELS
# ==================================

for app_label in TALENTBRIDGE_APPS:
    app_config = apps.get_app_config(app_label)

    for model in app_config.get_models():
        if admin.site.is_registered(model):
            continue

        model_label = model._meta.label

        admin_class = CUSTOM_ADMIN_CLASSES.get(
            model_label,
            admin.ModelAdmin,
        )

        admin.site.register(model, admin_class)

        


# ==================================
# ADMIN SITE BRANDING
# ==================================

admin.site.site_header = "TalentBridge Administration"
admin.site.site_title = "TalentBridge Admin"
admin.site.index_title = "System Management"
