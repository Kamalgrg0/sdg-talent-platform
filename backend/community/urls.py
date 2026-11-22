from django.urls import path

from . import views

urlpatterns = [
    path("", views.CommunityPostListCreateView.as_view(), name="community-posts"),
    path("comments/<int:pk>/", views.CommentDetailView.as_view(), name="comment-detail"),
    path("<int:pk>/", views.CommunityPostDetailView.as_view(), name="community-post-detail"),
    path("<int:pk>/comments/", views.CommentCreateView.as_view(), name="community-comment-create"),
]
