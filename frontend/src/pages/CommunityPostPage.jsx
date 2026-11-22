import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { Breadcrumb, DetailFacts } from "../components/Breadcrumb";
import { EmptyState } from "../components/EmptyState";
import { ErrorNotice } from "../components/ErrorNotice";
import { Loading } from "../components/Loading";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import {
  POST_STATUS_CLASSES,
  POST_TYPES,
  fieldError,
  formatDate,
  formatDateTime,
  roleLabel,
} from "../lib/format";
import { useApi } from "../lib/useApi";

const TYPE_BADGES = {
  discussion: "badge--blue",
  announcement: "badge--amber",
  event: "badge--green",
  resource: "badge--slate",
};

export default function CommunityPostPage() {
  const { id } = useParams();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const toast = useToast();
  const { data: post, loading, error, reload } = useApi(`/api/community/${id}/`);
  const related = useApi(`/api/community/?per_page=5`);

  const [comment, setComment] = useState("");
  const [commentErrors, setCommentErrors] = useState(null);
  const [commentMessage, setCommentMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading) return <Loading label="Loading post…" large />;
  if (error) {
    return (
      <div className="container section">
        <ErrorNotice message={error.message} onRetry={() => reload()} />
      </div>
    );
  }
  if (!post) return null;

  const author = post.author || {};
  const comments = post.comments || [];
  const visibleComments = comments.filter((item) => item.status === "visible");
  const isOwner = Boolean(user && (user.id === author.id || isAdmin));
  const typeLabel =
    post.type_label || POST_TYPES.find((type) => type.value === post.type)?.label || post.type;
  const otherRelated = (related.data?.results || []).filter((item) => item.id !== post.id).slice(0, 4);

  async function submitComment(event) {
    event.preventDefault();
    setSubmitting(true);
    setCommentErrors(null);
    setCommentMessage("");
    try {
      await api.post(`/api/community/${post.id}/comments/`, { body: comment.trim() });
      setComment("");
      toast.success("Comment posted.");
      await reload();
    } catch (err) {
      setCommentErrors(err.errors);
      setCommentMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function moderatePost(status) {
    setBusy(true);
    try {
      await api.patch(`/api/community/${post.id}/`, { status });
      toast.success(status === "hidden" ? "Post hidden." : "Post republished.");
      await reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function moderateComment(commentId, status) {
    setBusy(true);
    try {
      await api.patch(`/api/community/comments/${commentId}/`, { status });
      toast.success(status === "hidden" ? "Comment hidden." : "Comment restored.");
      await reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteComment(commentId) {
    if (!window.confirm("Delete this comment permanently?")) return;
    setBusy(true);
    try {
      await api.delete(`/api/community/comments/${commentId}/`);
      toast.success("Comment deleted.");
      await reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="detail-hero">
        <div className="container">
          <Breadcrumb
            items={[
              { label: "Community", to: "/community" },
              { label: post.title },
            ]}
          />

          <div className="detail-hero__badges">
            <span className={`badge ${TYPE_BADGES[post.type] || "badge--slate"}`}>{typeLabel}</span>
            {post.status !== "published" ? (
              <span className="badge badge--rose">Hidden</span>
            ) : null}
          </div>

          <h1>{post.title}</h1>

          <p className="detail-org">
            Posted by {author.name || "Community member"}
            {author.role ? <span className="text-muted"> · {roleLabel(author.role)}</span> : null}
          </p>

          <DetailFacts
            facts={[
              { label: "Posted", value: formatDateTime(post.created_at) },
              { label: "Type", value: typeLabel },
              ...(post.type === "event" && post.event_date
                ? [{ label: "Event", value: formatDateTime(post.event_date) }]
                : []),
              ...(post.event_location
                ? [{ label: "Location", value: post.event_location }]
                : []),
            ]}
          />
        </div>
      </section>

      <section className="section">
        <div className="container detail-layout">
          <article className="detail-main">
            {post.status !== "published" ? (
              <div className="notice notice--warning">
                <p>
                  <strong>This post is hidden.</strong> Only its author and administrators can see
                  it. It is not listed on the community hub.
                </p>
              </div>
            ) : null}

            <div className="detail-block">
              <h2>About this post</h2>
              <div className="prose" style={{ whiteSpace: "pre-wrap" }}>{post.body}</div>
            </div>

            {post.type === "resource" && post.resource_url ? (
              <div className="detail-block">
                <h2>Resource link</h2>
                <p className="prose">
                  <a href={post.resource_url} target="_blank" rel="noopener noreferrer">
                    {post.resource_url}
                  </a>
                </p>
                <p className="small text-muted">
                  External links are not reviewed by the platform. Open them at your own discretion.
                </p>
              </div>
            ) : null}

            <section className="comments-panel" id="comments" aria-labelledby="comments-heading">
              <div className="comments-panel__head">
                <h2 id="comments-heading">
                  Comments <span className="comments-count">{visibleComments.length}</span>
                </h2>
                <p className="small text-muted">Oldest first</p>
              </div>

              {comments.length === 0 ? (
                <EmptyState
                  compact
                  icon="?"
                  title="No comments yet"
                  text="Be the first to reply and keep the conversation going."
                />
              ) : (
                <ol className="comment-list">
                  {comments.map((item) => (
                    <li
                      className={`comment${item.status !== "visible" ? " comment--hidden" : ""}`}
                      key={item.id}
                    >
                      <Avatar name={item.author?.name || "Community member"} size="sm" />
                      <div className="comment__body">
                        <div className="comment__head">
                          <strong>{item.author?.name || "Community member"}</strong>
                          {item.author?.role ? (
                            <span className="text-muted small">{roleLabel(item.author.role)}</span>
                          ) : null}
                          <span className="text-muted small">· {formatDateTime(item.created_at)}</span>
                          {item.status !== "visible" ? (
                            <span className="badge badge--rose">Hidden</span>
                          ) : null}
                        </div>
                        <p className="comment__text" style={{ whiteSpace: "pre-wrap" }}>{item.body}</p>

                        {isAdmin ? (
                          <div className="comment-actions">
                            <button
                              className="btn btn--ghost btn--sm"
                              type="button"
                              onClick={() =>
                                moderateComment(item.id, item.status === "visible" ? "hidden" : "visible")
                              }
                              disabled={busy}
                            >
                              {item.status === "visible" ? "Hide comment" : "Restore comment"}
                            </button>
                            <button
                              className="btn btn--ghost btn--sm"
                              type="button"
                              onClick={() => deleteComment(item.id)}
                              disabled={busy}
                            >
                              Delete
                            </button>
                          </div>
                        ) : user?.id === item.author?.id ? (
                          <div className="comment-actions">
                            <button
                              className="btn btn--ghost btn--sm"
                              type="button"
                              onClick={() => deleteComment(item.id)}
                              disabled={busy}
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              {isAuthenticated ? (
                <form className="comment-form" onSubmit={submitComment} noValidate>
                  {commentMessage ? (
                    <div className="alert alert--error" role="alert">
                      <span className="alert-icon" aria-hidden="true">!</span>
                      <p>{commentMessage}</p>
                    </div>
                  ) : null}

                  <div className="form-field">
                    <label className="form-label" htmlFor="comment_body">
                      Add a comment <span className="required">*</span>
                    </label>
                    <textarea
                      id="comment_body"
                      className={`textarea${fieldError(commentErrors, "body") ? " is-invalid" : ""}`}
                      rows={4}
                      maxLength={2000}
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      required
                    />
                    <p className="help-text">Between 2 and 2,000 characters. Plain text only.</p>
                    {fieldError(commentErrors, "body") ? (
                      <p className="field-error">{fieldError(commentErrors, "body")}</p>
                    ) : null}
                  </div>

                  <button className="btn btn--primary" type="submit" disabled={submitting}>
                    {submitting ? "Posting…" : "Post comment"}
                  </button>
                </form>
              ) : (
                <>
                  <div className="notice notice--info">
                    <p>
                      <strong>Log in to join the conversation.</strong> Reading is open to everyone;
                      posting a comment needs a free account.
                    </p>
                  </div>
                  <div className="apply-actions">
                    <Link className="btn btn--primary" to={`/login?next=/community/${post.id}`}>
                      Log in to comment
                    </Link>
                    <Link className="btn btn--outline" to="/register">Create an account</Link>
                  </div>
                </>
              )}
            </section>
          </article>

          <aside className="detail-side">
            <div className="card">
              <div className="card-body">
                <h2 className="side-heading">About the author</h2>
                <div className="community-author-card">
                  <Avatar name={author.name || "Community member"} />
                  <div>
                    <p className="side-org-name">{author.name || "Community member"}</p>
                    <p className="small text-muted">{roleLabel(author.role)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h2 className="side-heading">Post details</h2>
                <dl className="side-list">
                  <div>
                    <dt>Type</dt>
                    <dd>{typeLabel}</dd>
                  </div>
                  <div>
                    <dt>Posted</dt>
                    <dd>{formatDate(post.created_at)}</dd>
                  </div>
                  <div>
                    <dt>Comments</dt>
                    <dd>{visibleComments.length}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <span className={`badge ${POST_STATUS_CLASSES[post.status] || "badge--slate"}`}>
                        {post.status === "hidden" ? "Hidden" : "Published"}
                      </span>
                    </dd>
                  </div>
                </dl>

                <div className="community-side__actions">
                  <Link className="btn btn--outline btn--block" to="/community">
                    Back to the community
                  </Link>
                </div>
              </div>
            </div>

            {isOwner && isAdmin ? (
              <div className="card">
                <div className="card-body">
                  <h2 className="side-heading">Moderation</h2>
                  <p className="small text-muted">
                    Administrators can hide a post from the public hub or restore it later.
                  </p>
                  <div className="stack--sm">
                    <button
                      className="btn btn--outline btn--block"
                      type="button"
                      onClick={() => moderatePost(post.status === "published" ? "hidden" : "published")}
                      disabled={busy}
                    >
                      {post.status === "published" ? "Hide post" : "Republish post"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {post.type === "event" && post.event_date ? (
              <div className="card sdg-card" style={{ "--sdg-color": "#1F7A4D" }}>
                <div className="card-body">
                  <h2 className="side-heading">Event details</h2>
                  <dl className="side-list side-list--compact">
                    <div>
                      <dt>When</dt>
                      <dd>{formatDateTime(post.event_date)}</dd>
                    </div>
                    {post.event_location ? (
                      <div>
                        <dt>Where</dt>
                        <dd>{post.event_location}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              </div>
            ) : null}

            {otherRelated.length > 0 ? (
              <div className="card">
                <div className="card-body">
                  <h2 className="side-heading">More from the community</h2>
                  <ul className="related-list">
                    {otherRelated.map((item) => (
                      <li key={item.id}>
                        <Link to={`/community/${item.id}`}>{item.title}</Link>
                        <span className="small text-muted">
                          {item.type_label || item.type} · {formatDate(item.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </>
  );
}
