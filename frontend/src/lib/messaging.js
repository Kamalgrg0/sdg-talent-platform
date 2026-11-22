import { api } from "./api";

/**
 * Open (or reuse) the conversation with another member.
 *
 * The API returns the canonical conversation for the pair, so calling this
 * repeatedly for the same person always lands in one thread. Passing a subject
 * or body also sends the first message.
 */
export async function startConversation({ userId, subject, body } = {}) {
  const payload = { user_id: userId };
  if (subject && subject.trim()) payload.subject = subject.trim();
  if (body && body.trim()) payload.body = body.trim();
  return api.post("/api/messaging/", payload);
}
