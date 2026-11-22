import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { startConversation } from "../lib/messaging";

/**
 * Opens a private conversation with another member and jumps straight to it.
 * Renders nothing when there is no target or when the target is the viewer.
 */
export function MessageButton({
  userId,
  subject = "",
  label = "Message",
  className = "btn btn--outline btn--sm",
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (!userId || (user && Number(user.id) === Number(userId))) return null;

  async function handleClick() {
    setBusy(true);
    try {
      const conversation = await startConversation({ userId, subject });
      navigate(`/messages/${conversation.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className={className} type="button" onClick={handleClick} disabled={busy}>
      {busy ? "Opening…" : label}
    </button>
  );
}
