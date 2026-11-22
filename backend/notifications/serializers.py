from rest_framework import serializers

from core.links import normalize_frontend_link

from .models import EmailOutbox, Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "type", "title", "message", "link", "is_read", "created_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Repair links stored before the React route names were corrected.
        data["link"] = normalize_frontend_link(data.get("link"))
        return data


class EmailOutboxSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailOutbox
        fields = [
            "id",
            "user",
            "recipient_email",
            "recipient_name",
            "subject",
            "status",
            "attempts",
            "last_error",
            "created_at",
            "sent_at",
        ]
