from django.shortcuts import get_object_or_404
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdmin

from .models import EmailOutbox, Notification
from .serializers import EmailOutboxSerializer, NotificationSerializer


class NotificationListView(ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)
        if self.request.query_params.get("unread") in {"1", "true", "yes"}:
            qs = qs.filter(is_read=False)
        return qs.order_by("-created_at", "-id")


class UnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"count": Notification.objects.filter(user=request.user, is_read=False).count()})


class MarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        notification = get_object_or_404(Notification, pk=pk, user=request.user)
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(NotificationSerializer(notification).data)


class MarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        updated = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"updated": updated})


class EmailOutboxListView(ListAPIView):
    serializer_class = EmailOutboxSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = EmailOutbox.objects.select_related("user")
        status_value = self.request.query_params.get("status")
        if status_value:
            qs = qs.filter(status=status_value)
        return qs.order_by("-created_at")
