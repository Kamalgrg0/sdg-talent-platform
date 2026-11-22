from django.conf import settings
from django.db import models
from django.db.models import Q


class Conversation(models.Model):
    """A one-to-one conversation between two accounts.

    ``user_a`` is always the lower user id so the unique constraint can keep a
    single thread per pair regardless of who started it.
    """

    user_a = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversations_as_a",
    )
    user_b = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversations_as_b",
    )
    subject = models.CharField(max_length=180, blank=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "conversations"
        ordering = ["-last_message_at", "-updated_at", "-id"]
        constraints = [
            models.UniqueConstraint(fields=["user_a", "user_b"], name="uniq_conversation_pair"),
            models.CheckConstraint(
                check=~Q(user_a=models.F("user_b")), name="conversation_between_two_users"
            ),
        ]
        indexes = [
            models.Index(fields=["user_a", "last_message_at"]),
            models.Index(fields=["user_b", "last_message_at"]),
        ]

    def __str__(self):
        return f"{self.user_a_id} <> {self.user_b_id}"

    @classmethod
    def between(cls, first, second):
        """Return (or create) the canonical conversation for two users."""
        if first.pk == second.pk:
            raise ValueError("A conversation needs two different accounts.")
        low, high = sorted((first, second), key=lambda user: user.pk)
        conversation, _ = cls.objects.get_or_create(user_a=low, user_b=high)
        return conversation

    def counterpart_for(self, user):
        return self.user_b if self.user_a_id == user.pk else self.user_a

    def includes(self, user):
        return user.pk in {self.user_a_id, self.user_b_id}


class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages"
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_messages",
    )
    body = models.TextField()
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "messages"
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(fields=["conversation", "created_at"]),
            models.Index(fields=["conversation", "read_at"]),
        ]

    def __str__(self):
        return f"Message {self.pk}"
