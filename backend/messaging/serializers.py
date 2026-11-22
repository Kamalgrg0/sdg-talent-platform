from rest_framework import serializers

from accounts.models import User
from accounts.serializers import PublicUserSerializer

from .models import Conversation, Message


def _current_user(context):
    request = context.get("request")
    return request.user if request and request.user.is_authenticated else None


class MessageSerializer(serializers.ModelSerializer):
    sender = PublicUserSerializer(read_only=True)
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ["id", "sender", "body", "read_at", "created_at", "is_mine"]
        read_only_fields = ["id", "sender", "read_at", "created_at", "is_mine"]

    def get_is_mine(self, obj):
        user = _current_user(self.context)
        return bool(user and obj.sender_id == user.pk)


class ConversationSerializer(serializers.ModelSerializer):
    counterpart = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "subject",
            "counterpart",
            "last_message",
            "unread_count",
            "last_message_at",
            "created_at",
            "updated_at",
        ]

    def get_counterpart(self, obj):
        user = _current_user(self.context)
        other = obj.counterpart_for(user) if user else obj.user_b
        return {"id": other.pk, "name": other.name, "role": other.role}

    def get_last_message(self, obj):
        message = obj.messages.select_related("sender").order_by("-created_at", "-id").first()
        if not message:
            return None
        return {
            "id": message.pk,
            "body": message.body[:160],
            "sender_id": message.sender_id,
            "created_at": message.created_at,
        }

    def get_unread_count(self, obj):
        user = _current_user(self.context)
        if not user:
            return 0
        annotated = getattr(obj, "unread_count", None)
        if annotated is not None:
            return annotated
        return obj.messages.filter(read_at__isnull=True).exclude(sender=user).count()


class ConversationCreateSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    subject = serializers.CharField(max_length=180, required=False, allow_blank=True)
    body = serializers.CharField(max_length=5000, required=False, allow_blank=True)

    def validate_user_id(self, value):
        request = self.context["request"]
        if value == request.user.pk:
            raise serializers.ValidationError("You cannot start a conversation with yourself.")
        if not User.objects.filter(pk=value, status="active").exists():
            raise serializers.ValidationError("That account is not available.")
        return value


class MessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=5000, trim_whitespace=True)
