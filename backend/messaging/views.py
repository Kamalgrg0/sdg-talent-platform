from django.db import IntegrityError
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView, RetrieveAPIView

from accounts.models import User
from core.services import notify, queue_email

from .models import Conversation, Message
from .serializers import (
    ConversationCreateSerializer,
    ConversationSerializer,
    MessageCreateSerializer,
    MessageSerializer,
)


def conversations_for(user):
    return (
        Conversation.objects.filter(Q(user_a=user) | Q(user_b=user))
        .select_related("user_a", "user_b")
        .annotate(
            unread_count=Count(
                "messages",
                filter=Q(messages__read_at__isnull=True) & ~Q(messages__sender=user),
            )
        )
    )


def send_message(conversation, sender, body):
    recipient = conversation.counterpart_for(sender)
    message = Message.objects.create(conversation=conversation, sender=sender, body=body)
    conversation.last_message_at = message.created_at
    conversation.save(update_fields=["last_message_at", "updated_at"])

    preview = body if len(body) <= 180 else f"{body[:177]}…"
    conversation_link = f"/messages/{conversation.pk}"
    notify(
        recipient,
        "message",
        f"New message from {sender.name}",
        preview,
        conversation_link,
    )
    queue_email(
        recipient,
        f"New message from {sender.name}",
        "new_message",
        {
            "sender": sender,
            "recipient": recipient,
            "conversation": conversation,
            "message": message,
            "preview": preview,
            "link": conversation_link,
        },
        recipient_email=recipient.email,
        recipient_name=recipient.name,
    )
    return message


class ConversationListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationSerializer
    pagination_class = None

    def get_queryset(self):
        return conversations_for(self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = ConversationCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        target = User.objects.get(pk=data["user_id"])

        try:
            conversation = Conversation.between(request.user, target)
        except IntegrityError:
            low, high = sorted((request.user, target), key=lambda user: user.pk)
            conversation = Conversation.objects.get(user_a=low, user_b=high)

        if data.get("subject") and not conversation.subject:
            conversation.subject = data["subject"]
            conversation.save(update_fields=["subject", "updated_at"])

        if data.get("body", "").strip():
            send_message(conversation, request.user, data["body"].strip())

        conversation = conversations_for(request.user).get(pk=conversation.pk)
        return Response(
            ConversationSerializer(conversation, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ConversationDetailView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationSerializer

    def get_queryset(self):
        return conversations_for(self.request.user)


class ConversationMessagesView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer
    pagination_class = None

    def get_conversation(self):
        conversation = get_object_or_404(Conversation, pk=self.kwargs["pk"])
        if not conversation.includes(self.request.user):
            return None
        return conversation

    def get_queryset(self):
        conversation = self.get_conversation()
        if not conversation:
            return Message.objects.none()
        return conversation.messages.select_related("sender").order_by("created_at", "id")

    def create(self, request, *args, **kwargs):
        conversation = self.get_conversation()
        if not conversation:
            return Response({"detail": "Conversation not found."}, status=404)
        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = send_message(conversation, request.user, serializer.validated_data["body"])
        return Response(
            MessageSerializer(message, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ConversationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        conversation = get_object_or_404(Conversation, pk=pk)
        if not conversation.includes(request.user):
            return Response({"detail": "Conversation not found."}, status=404)
        updated = (
            conversation.messages.filter(read_at__isnull=True)
            .exclude(sender=request.user)
            .update(read_at=timezone.now())
        )
        return Response({"marked_read": updated, "unread_count": 0})


class UnreadMessagesCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Message.objects.filter(
            conversation__in=Conversation.objects.filter(
                Q(user_a=request.user) | Q(user_b=request.user)
            ),
            read_at__isnull=True,
        ).exclude(sender=request.user).count()
        return Response({"count": count})
