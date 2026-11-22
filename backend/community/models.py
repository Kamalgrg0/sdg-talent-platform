from django.conf import settings
from django.db import models


class PostType(models.TextChoices):
    DISCUSSION = "discussion", "Discussion"
    ANNOUNCEMENT = "announcement", "Announcement"
    EVENT = "event", "Event"
    RESOURCE = "resource", "Resource"


class PostStatus(models.TextChoices):
    PUBLISHED = "published", "Published"
    HIDDEN = "hidden", "Hidden"


class CommentStatus(models.TextChoices):
    VISIBLE = "visible", "Visible"
    HIDDEN = "hidden", "Hidden"


class CommunityPost(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="community_posts")
    title = models.CharField(max_length=180)
    body = models.TextField()
    type = models.CharField(max_length=16, choices=PostType.choices, default=PostType.DISCUSSION)
    event_date = models.DateTimeField(null=True, blank=True)
    event_location = models.CharField(max_length=160, blank=True)
    resource_url = models.URLField(max_length=255, blank=True)
    status = models.CharField(max_length=10, choices=PostStatus.choices, default=PostStatus.PUBLISHED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "community_posts"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["type"]),
            models.Index(fields=["user"]),
        ]

    def __str__(self):
        return self.title


class Comment(models.Model):
    post = models.ForeignKey(CommunityPost, on_delete=models.CASCADE, related_name="comments")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="comments")
    body = models.TextField()
    status = models.CharField(max_length=10, choices=CommentStatus.choices, default=CommentStatus.VISIBLE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "comments"
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(fields=["post", "status", "created_at"]),
            models.Index(fields=["user"]),
        ]

    def __str__(self):
        return f"Comment on {self.post_id}"
