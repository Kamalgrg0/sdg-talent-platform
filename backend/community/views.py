from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdmin

from .models import Comment, CommentStatus, CommunityPost, PostStatus
from .serializers import (
    CommentSerializer,
    CommentStatusSerializer,
    CommentWriteSerializer,
    PostDetailSerializer,
    PostListSerializer,
    PostWriteSerializer,
)


class CommunityPostListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated()]
        return []

    def get_queryset(self):
        qs = CommunityPost.objects.select_related("user").annotate(
            comment_count=Count("comments", filter=Q(comments__status="visible"), distinct=True)
        )
        params = self.request.query_params
        requested_status = params.get("status")
        if requested_status and self.request.user.is_authenticated and self.request.user.role == "admin":
            if requested_status != "all":
                qs = qs.filter(status=requested_status)
        else:
            qs = qs.filter(status=PostStatus.PUBLISHED)
        post_type = params.get("type")
        if post_type:
            qs = qs.filter(type=post_type)
        keyword = params.get("q", "").strip()
        if keyword:
            qs = qs.filter(Q(title__icontains=keyword) | Q(body__icontains=keyword))
        return qs.order_by("-created_at", "-id")

    def get_serializer_class(self):
        return PostWriteSerializer if self.request.method == "POST" else PostListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        post = serializer.save(user=request.user, status=PostStatus.PUBLISHED)
        return Response(
            PostDetailSerializer(post, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class CommunityPostDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticatedOrReadOnly]
    queryset = CommunityPost.objects.select_related("user").prefetch_related("comments__user")

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return PostWriteSerializer
        return PostDetailSerializer

    def get_object(self):
        post = super().get_object()
        if post.status != PostStatus.PUBLISHED:
            request = self.request
            if not request.user.is_authenticated or (
                request.user.role != "admin" and post.user_id != request.user.id
            ):
                from rest_framework.exceptions import NotFound

                raise NotFound("Post not found.")
        return post

    def _can_manage(self, request, post):
        return request.user.is_authenticated and (
            request.user.role == "admin" or post.user_id == request.user.id
        )

    def update(self, request, *args, **kwargs):
        post = self.get_object()
        if not self._can_manage(request, post):
            return Response({"detail": "You do not have permission to edit this post."}, status=403)
        # Only administrators may change moderation status directly.
        if "status" in request.data:
            if request.user.role != "admin":
                return Response({"detail": "Only administrators can change post visibility."}, status=403)
            post.status = request.data["status"]
            post.save(update_fields=["status", "updated_at"])
        serializer = self.get_serializer(post, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(PostDetailSerializer(post, context={"request": request}).data)

    def destroy(self, request, *args, **kwargs):
        post = self.get_object()
        if not self._can_manage(request, post):
            return Response({"detail": "You do not have permission to delete this post."}, status=403)
        return super().destroy(request, *args, **kwargs)


class CommentCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        post = get_object_or_404(CommunityPost, pk=pk)
        if post.status != PostStatus.PUBLISHED:
            return Response({"detail": "You cannot comment on a hidden post."}, status=400)
        serializer = CommentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = Comment.objects.create(post=post, user=request.user, body=serializer.validated_data["body"])
        return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class CommentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        if request.user.role != "admin":
            return Response({"detail": "Only administrators can moderate comments."}, status=403)
        serializer = CommentStatusSerializer(comment, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(CommentSerializer(comment).data)

    def delete(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        if request.user.role != "admin" and comment.user_id != request.user.id:
            return Response({"detail": "You do not have permission to delete this comment."}, status=403)
        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
