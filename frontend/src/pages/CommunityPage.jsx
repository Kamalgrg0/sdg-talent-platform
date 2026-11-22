import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ErrorNotice } from "../components/ErrorNotice";
import { Field, SelectField } from "../components/Field";
import { Loading } from "../components/Loading";
import { PageHeader } from "../components/PageHeader";
import { Pagination } from "../components/Pagination";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import {
  POST_TYPES,
  fieldError,
  formatDateTime,
  roleLabel,
  truncate,
} from "../lib/format";

const PER_PAGE = 8;
const EMPTY_FILTERS = { q: "", type: "" };

const TYPE_BADGES = {
  discussion: "badge--blue",
  announcement: "badge--amber",
  event: "badge--green",
  resource: "badge--slate",
};

function PostCard({ post }) {
  const author = post.author || {};
  return (
    <article className="card community-card">
      <div className="card-body">
        <div className="community-card__head">
          <span className={`badge ${TYPE_BADGES[post.type] || "badge--slate"}`}>
            {post.type_label || post.type}
          </span>
          <span className="community-date">{formatDateTime(post.created_at)}</span>
        </div>

        <h2 className="card-title">
          <Link to={`/community/${post.id}`}>{post.title}</Link>
        </h2>

        <p className="community-author">
          By <strong>{author.name || "Community member"}</strong>
          {author.role ? <span className="text-muted"> · {roleLabel(author.role)}</span> : null}
        </p>

        <p className="card-summary">{truncate(post.body, 220)}</p>

        {post.type === "event" && post.event_date ? (
          <p className="community-fact">
            <span className="community-fact__label">When</span>
            {formatDateTime(post.event_date)}
            {post.event_location ? (
              <>
                <span className="community-fact__label">Where</span>
                {post.event_location}
              </>
            ) : null}
          </p>
        ) : post.type === "resource" && post.resource_url ? (
          <p className="community-fact">
            <span className="community-fact__label">Link</span>
            <a href={post.resource_url} target="_blank" rel="noopener noreferrer">
              Open resource
            </a>
          </p>
        ) : null}

        <div className="card-footer">
          <span className="community-comment-count">
            {post.comment_count || 0} comment{(post.comment_count || 0) === 1 ? "" : "s"}
          </span>
          <Link className="link-arrow" to={`/community/${post.id}`}>
            Read and reply
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function CommunityPage() {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_FILTERS);

  const [compose, setCompose] = useState({
    type: "discussion",
    title: "",
    body: "",
    event_date: "",
    event_location: "",
    resource_url: "",
  });
  const [composeErrors, setComposeErrors] = useState(null);
  const [composeMessage, setComposeMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const queryKey = searchParams.toString();

  const activeFilters = useMemo(() => {
    const filters = {};
    Object.keys(EMPTY_FILTERS).forEach((key) => {
      const value = searchParams.get(key);
      if (value) filters[key] = value;
    });
    return filters;
  }, [queryKey]);

  useEffect(() => {
    setForm({ ...EMPTY_FILTERS, ...activeFilters });
  }, [queryKey]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .get("/api/community/", { ...activeFilters, page, per_page: PER_PAGE })
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [queryKey]);

  const results = data?.results || [];
  const count = data?.count || 0;
  const hasFilters = Object.keys(activeFilters).length > 0;

  function applyFilters(event) {
    event.preventDefault();
    const next = {};
    Object.entries(form).forEach(([key, value]) => {
      if (value) next[key] = value;
    });
    setSearchParams(next);
  }

  function resetFilters() {
    setForm(EMPTY_FILTERS);
    setSearchParams({});
  }

  function goToPage(nextPage) {
    const next = { ...activeFilters };
    if (nextPage > 1) next.page = String(nextPage);
    setSearchParams(next);
    document.getElementById("feed")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateCompose(field) {
    return (event) => setCompose((current) => ({ ...current, [field]: event.target.value }));
  }

  async function submitPost(event) {
    event.preventDefault();
    setSubmitting(true);
    setComposeMessage("");
    setComposeErrors(null);
    const payload = {
      type: compose.type,
      title: compose.title.trim(),
      body: compose.body.trim(),
    };
    if (compose.type === "event") {
      if (compose.event_date) payload.event_date = compose.event_date;
      if (compose.event_location.trim()) payload.event_location = compose.event_location.trim();
    }
    if (compose.type === "resource" && compose.resource_url.trim()) {
      payload.resource_url = compose.resource_url.trim();
    }
    try {
      const post = await api.post("/api/community/", payload);
      toast.success("Your post is published.");
      setCompose({
        type: "discussion",
        title: "",
        body: "",
        event_date: "",
        event_location: "",
        resource_url: "",
      });
      setSearchParams({});
      if (post?.id) {
        // Keep the user on the hub; the new post appears at the top.
        setData((current) => (current ? { ...current } : current));
      }
      const fresh = await api.get("/api/community/", { page: 1, per_page: PER_PAGE });
      setData(fresh);
    } catch (err) {
      setComposeErrors(err.errors);
      setComposeMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const formTypes = POST_TYPES.filter((type) => type.value !== "announcement" || isAdmin);

  return (
    <>
      <PageHeader
        eyebrow="Community hub"
        title="Learn, share, and build together"
        lead="Ask a question, announce an event, or share a resource with people working on digital skills and the Sustainable Development Goals."
        actions={
          isAuthenticated ? (
            <a className="btn btn--primary" href="#compose">
              Start a discussion
            </a>
          ) : (
            <>
              <Link className="btn btn--primary" to="/login">Log in to post</Link>
              <Link className="btn btn--outline" to="/register">Create an account</Link>
            </>
          )
        }
      />

      <section className="section section--tight">
        <div className="container community-layout">
          <div className="community-main" id="feed">
            <div className="results-panel">
              <div className="results-head">
                <p className="results-count">
                  {loading
                    ? "Loading community posts…"
                    : count === 0
                    ? "No community posts match these filters"
                    : (
                        <>
                          Showing <strong>{(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, count)}</strong> of{" "}
                          <strong>{count}</strong> post{count === 1 ? "" : "s"}
                        </>
                      )}
                </p>
                <p className="results-sort">Newest first</p>
              </div>

              <form className="filter-form filter-form--inline" onSubmit={applyFilters}>
                <div className="form-field">
                  <label className="form-label" htmlFor="community-q">Keyword</label>
                  <input
                    id="community-q"
                    className="input"
                    type="search"
                    value={form.q}
                    onChange={(event) => setForm((c) => ({ ...c, q: event.target.value }))}
                    placeholder="Search titles and posts"
                  />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="community-type">Post type</label>
                  <select
                    id="community-type"
                    className="select"
                    value={form.type}
                    onChange={(event) => setForm((c) => ({ ...c, type: event.target.value }))}
                  >
                    <option value="">Any type</option>
                    {POST_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-form__actions">
                  <button className="btn btn--primary" type="submit">Apply</button>
                  <button className="btn btn--ghost" type="button" onClick={resetFilters}>Reset</button>
                </div>
              </form>

              {hasFilters ? (
                <div className="active-filters" aria-label="Active filters">
                  <span className="active-filters__label">Active:</span>
                  {activeFilters.q ? <span className="chip">Keyword: {activeFilters.q}</span> : null}
                  {activeFilters.type ? (
                    <span className="chip">
                      {POST_TYPES.find((type) => type.value === activeFilters.type)?.label || activeFilters.type}
                    </span>
                  ) : null}
                  <button type="button" className="chip" onClick={resetFilters}>Clear all</button>
                </div>
              ) : null}

              {error ? (
                <ErrorNotice message={error.message} onRetry={() => setSearchParams(new URLSearchParams(queryKey))} />
              ) : loading ? (
                <Loading label="Loading community posts…" />
              ) : results.length === 0 ? (
                <EmptyState
                  icon="?"
                  title="Nothing here yet"
                  text="Try a different keyword or post type. If you are signed in, you can be the first to start a conversation."
                  action={
                    <button className="btn btn--primary" type="button" onClick={resetFilters}>
                      Show all posts
                    </button>
                  }
                />
              ) : (
                <>
                  <div className="community-feed">
                    {results.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                  <Pagination page={page} count={count} perPage={PER_PAGE} onPage={goToPage} label="community" />
                </>
              )}
            </div>
          </div>

          <aside className="community-side" aria-label="Community tools">
            {isAuthenticated ? (
              <div className="card" id="compose">
                <div className="card-body">
                  <h2 className="side-heading">Share with the community</h2>

                  {composeMessage ? (
                    <div className="alert alert--error" role="alert">
                      <span className="alert-icon" aria-hidden="true">!</span>
                      <p>{composeMessage}</p>
                    </div>
                  ) : null}

                  <form className="community-form" onSubmit={submitPost} noValidate>
                    <SelectField
                      label="Post type"
                      name="post_type"
                      value={compose.type}
                      onChange={updateCompose("type")}
                      options={formTypes}
                      required
                      error={fieldError(composeErrors, "type")}
                    />

                    <Field label="Title" htmlFor="post_title" required error={fieldError(composeErrors, "title")}>
                      <input
                        id="post_title"
                        className={`input${fieldError(composeErrors, "title") ? " is-invalid" : ""}`}
                        type="text"
                        value={compose.title}
                        onChange={updateCompose("title")}
                        maxLength={180}
                        required
                      />
                    </Field>

                    <Field
                      label="Message"
                      htmlFor="post_body"
                      required
                      hint="Plain text. Between 20 and 10,000 characters."
                      error={fieldError(composeErrors, "body")}
                    >
                      <textarea
                        id="post_body"
                        className={`textarea${fieldError(composeErrors, "body") ? " is-invalid" : ""}`}
                        rows={7}
                        maxLength={10000}
                        value={compose.body}
                        onChange={updateCompose("body")}
                        required
                      />
                    </Field>

                    <fieldset className="community-form__optional">
                      <legend>Optional details</legend>

                      <Field label="Event date and time" htmlFor="event_date" error={fieldError(composeErrors, "event_date")}>
                        <input
                          id="event_date"
                          className={`input${fieldError(composeErrors, "event_date") ? " is-invalid" : ""}`}
                          type="datetime-local"
                          value={compose.event_date}
                          onChange={updateCompose("event_date")}
                        />
                      </Field>

                      <Field label="Event location" htmlFor="event_location" error={fieldError(composeErrors, "event_location")}>
                        <input
                          id="event_location"
                          className="input"
                          type="text"
                          value={compose.event_location}
                          onChange={updateCompose("event_location")}
                          maxLength={160}
                        />
                      </Field>

                      <Field label="Resource link" htmlFor="resource_url" error={fieldError(composeErrors, "resource_url")}>
                        <input
                          id="resource_url"
                          className="input"
                          type="url"
                          value={compose.resource_url}
                          onChange={updateCompose("resource_url")}
                          maxLength={255}
                          placeholder="https://example.com/guide"
                        />
                      </Field>

                      <p className="help-text">
                        Event details are shown on event posts; the link is shown on resource posts. Both are optional.
                      </p>
                    </fieldset>

                    <button className="btn btn--primary btn--block" type="submit" disabled={submitting}>
                      {submitting ? "Publishing…" : "Publish post"}
                    </button>
                    <p className="small text-muted community-form__note">
                      Posts are public. Please do not share private contact details.
                    </p>
                  </form>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-body">
                  <h2 className="side-heading">Join the conversation</h2>
                  <p className="small">
                    Anyone can read the community. Log in or create a free account to publish a post
                    or reply to a discussion.
                  </p>
                  <div className="community-side__actions">
                    <Link className="btn btn--primary btn--block" to="/login">Log in</Link>
                    <Link className="btn btn--outline btn--block" to="/register">Create an account</Link>
                  </div>
                </div>
              </div>
            )}

            {user ? (
              <div className="card">
                <div className="card-body">
                  <h2 className="side-heading">Community guidelines</h2>
                  <ul className="side-list side-list--compact">
                    <li>Be specific: a clear question gets a better answer.</li>
                    <li>Share resources that are free or clearly described.</li>
                    <li>Keep private contact details out of public posts.</li>
                    <li>Announcements are reserved for administrators.</li>
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
