import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { EmptyState } from "../components/EmptyState";
import { ErrorNotice } from "../components/ErrorNotice";
import { Loading } from "../components/Loading";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import { formatDateTime, roleLabel, truncate } from "../lib/format";
import { useApi } from "../lib/useApi";

export default function MessagesPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const conversations = useApi("/api/messaging/");
  const [messages, setMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const rows = Array.isArray(conversations.data) ? conversations.data : [];
  const activeId = id ? Number(id) : null;
  const active = rows.find((item) => item.id === activeId) || null;

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return undefined;
    }
    let activeRequest = true;
    setThreadLoading(true);
    setThreadError(null);
    api
      .get(`/api/messaging/${activeId}/messages/`)
      .then(async (data) => {
        if (!activeRequest) return;
        setMessages(Array.isArray(data) ? data : []);
        await api.post(`/api/messaging/${activeId}/read/`).catch(() => null);
        if (activeRequest) {
          window.dispatchEvent(new Event("messages:read"));
          conversations.reload();
        }
      })
      .catch((err) => {
        if (activeRequest) setThreadError(err);
      })
      .finally(() => {
        if (activeRequest) setThreadLoading(false);
      });
    return () => {
      activeRequest = false;
    };
  }, [activeId, conversations.reload]);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ block: "end" });
    }
  }, [messages.length, activeId]);

  async function handleSend(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !activeId) return;
    setSending(true);
    try {
      const message = await api.post(`/api/messaging/${activeId}/messages/`, { body });
      setMessages((current) => [...current, message]);
      setDraft("");
      conversations.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  }

  const totalUnread = rows.reduce((sum, item) => sum + (item.unread_count || 0), 0);

  return (
    <>
      <PageHeader
        eyebrow="Private to you"
        title="Messages"
        lead={
          totalUnread > 0
            ? `You have ${totalUnread} unread message${totalUnread === 1 ? "" : "s"}. Replies stay in one thread per person.`
            : "Talk directly with employers, organizations, and talent about roles, offers, and next steps."
        }
        actions={
          <>
            <Link className="btn btn--outline" to="/dashboard">
              Back to dashboard
            </Link>
            <Link className="btn btn--ghost" to="/notifications">
              Notifications
            </Link>
          </>
        }
      />

      <section className="section section--tight">
        <div className="container">
          <div className="messages-layout">
            <aside className="card messages-sidebar" aria-label="Conversations">
              <div className="card-body">
                <div className="dashboard-card-head">
                  <div>
                    <span className="eyebrow">Inbox</span>
                    <h2 className="dashboard-card-title">
                      Conversations ({rows.length})
                    </h2>
                  </div>
                  {totalUnread > 0 ? (
                    <span className="badge badge--amber">{totalUnread} new</span>
                  ) : null}
                </div>

                {conversations.loading ? (
                  <Loading label="Loading conversations…" />
                ) : conversations.error ? (
                  <ErrorNotice message={conversations.error.message} onRetry={conversations.reload} />
                ) : rows.length === 0 ? (
                  <EmptyState
                    compact
                    icon="?"
                    title="No conversations yet"
                    text="Open an opportunity and use “Message” to contact the organization, or reply to someone who contacted you."
                    action={
                      <Link className="btn btn--primary" to="/opportunities">
                        Browse opportunities
                      </Link>
                    }
                  />
                ) : (
                  <ul className="conversation-list">
                    {rows.map((conversation) => {
                      const selected = conversation.id === activeId;
                      return (
                        <li key={conversation.id}>
                          <Link
                            className={`conversation-link${selected ? " is-active" : ""}${
                              conversation.unread_count ? " has-unread" : ""
                            }`}
                            to={`/messages/${conversation.id}`}
                          >
                            <Avatar name={conversation.counterpart?.name} />
                            <span className="conversation-main">
                              <span className="conversation-head">
                                <strong>{conversation.counterpart?.name || "Member"}</strong>
                                <time dateTime={conversation.last_message_at || conversation.updated_at}>
                                  {formatDateTime(
                                    conversation.last_message_at || conversation.updated_at
                                  )}
                                </time>
                              </span>
                              <span className="conversation-role">
                                {roleLabel(conversation.counterpart?.role)}
                                {conversation.subject ? ` · ${conversation.subject}` : ""}
                              </span>
                              <span className="conversation-preview">
                                {conversation.last_message
                                  ? truncate(conversation.last_message.body, 90)
                                  : "No messages yet"}
                              </span>
                            </span>
                            {conversation.unread_count ? (
                              <span className="conversation-unread">
                                {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </aside>

            <section className="card messages-thread" aria-label="Conversation">
              <div className="card-body">
                {!activeId ? (
                  <EmptyState
                    icon="?"
                    title="Select a conversation"
                    text="Pick a thread on the left to read it and reply. Messages are private between you and the other member."
                  />
                ) : threadLoading ? (
                  <Loading label="Loading messages…" />
                ) : threadError ? (
                  <ErrorNotice message={threadError.message} />
                ) : !active && conversations.loading ? (
                  <Loading label="Loading conversation…" />
                ) : !active ? (
                  <EmptyState
                    icon="?"
                    title="Conversation not found"
                    text="This thread may have been removed, or it belongs to another account."
                    action={
                      <Link className="btn btn--outline" to="/messages">
                        Back to inbox
                      </Link>
                    }
                  />
                ) : (
                  <>
                    <header className="thread-head">
                      <div className="thread-person">
                        <Avatar name={active.counterpart?.name} size="lg" />
                        <div>
                          <h2>{active.counterpart?.name || "Member"}</h2>
                          <p className="small text-muted">
                            {roleLabel(active.counterpart?.role)}
                            {active.subject ? ` · ${active.subject}` : ""}
                          </p>
                        </div>
                      </div>
                      <span className="badge badge--slate">
                        {messages.length} message{messages.length === 1 ? "" : "s"}
                      </span>
                    </header>

                    <div className="thread-messages">
                      {messages.length === 0 ? (
                        <p className="small text-muted thread-empty">
                          This conversation has no messages yet. Say hello below to get started.
                        </p>
                      ) : (
                        messages.map((message) => (
                          <div
                            className={`thread-message${message.is_mine ? " is-mine" : ""}`}
                            key={message.id}
                          >
                            <div className="thread-bubble">
                              <p>{message.body}</p>
                              <span className="thread-meta">
                                {message.is_mine ? "You" : message.sender?.name || "Member"} ·{" "}
                                {formatDateTime(message.created_at)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={endRef} />
                    </div>

                    <form className="thread-composer" onSubmit={handleSend}>
                      <label className="sr-only" htmlFor="message-body">
                        Write a message
                      </label>
                      <textarea
                        className="textarea"
                        id="message-body"
                        rows={3}
                        maxLength={5000}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder={`Write to ${active.counterpart?.name || "this member"}…`}
                      />
                      <div className="thread-composer__actions">
                        <span className="small text-muted">
                          {user?.name} · messages are private to this thread
                        </span>
                        <button
                          className="btn btn--primary"
                          type="submit"
                          disabled={sending || !draft.trim()}
                        >
                          {sending ? "Sending…" : "Send message"}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
