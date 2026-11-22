from rest_framework import serializers

from accounts.serializers import PublicUserSerializer

from .models import Comment, CommunityPost


class CommentSerializer(serializers.ModelSerializer):
    author = PublicUserSerializer(source="user", read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "post", "author", "body", "status", "created_at"]


class PostListSerializer(serializers.ModelSerializer):
    author = PublicUserSerializer(source="user", read_only=True)
    type_label = serializers.CharField(source="get_type_display", read_only=True)
    comment_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = CommunityPost
        fields = [
            "id",
            "title",
            "body",
            "author",
            "type",
            "type_label",
            "event_date",
            "event_location",
            "resource_url",
            "status",
            "comment_count",
            "created_at",
        ]


class PostDetailSerializer(PostListSerializer):
    comments = serializers.SerializerMethodField()

    class Meta(PostListSerializer.Meta):
        fields = PostListSerializer.Meta.fields + ["comments"]

    def get_comments(self, obj):
        request = self.context.get("request")
        qs = obj.comments.select_related("user")
        if not request or not request.user.is_authenticated or request.user.role != "admin":
            qs = qs.filter(status="visible")
        return CommentSerializer(qs, many=True).data


class PostWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityPost
        fields = ["id", "title", "body", "type", "event_date", "event_location", "resource_url"]

    def validate_type(self, value):
        request = self.context.get("request")
        if value == "announcement" and (not request or request.user.role != "admin"):
            raise serializers.ValidationError("Only administrators can publish announcements.")
        return value

    def validate(self, attrs):
        post_type = attrs.get("type", getattr(self.instance, "type", "discussion"))
        if post_type == "event" and not attrs.get("event_date", getattr(self.instance, "event_date", None)):
            raise serializers.ValidationError({"event_date": "An event date is required for events."})
        return attrs


class CommentWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ["body"]

    def validate_body(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Please write a comment.")
        return value


class CommentStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ["status"]
