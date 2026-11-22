from django.urls import path

from . import views

urlpatterns = [
    path("", views.ConversationListCreateView.as_view(), name="conversation-list"),
    path("unread-count/", views.UnreadMessagesCountView.as_view(), name="message-unread-count"),
    path("<int:pk>/", views.ConversationDetailView.as_view(), name="conversation-detail"),
    path("<int:pk>/messages/", views.ConversationMessagesView.as_view(), name="conversation-messages"),
    path("<int:pk>/read/", views.ConversationReadView.as_view(), name="conversation-read"),
]
