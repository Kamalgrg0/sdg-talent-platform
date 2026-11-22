import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";

/**
 * Deletes an opportunity the current account owns. The server also enforces
 * ownership, so this button is only a convenience for the UI.
 */
export function DeleteOpportunityButton({
  opportunityId,
  opportunityTitle,
  onDeleted,
  navigateTo = "/dashboard/employer",
  label = "Delete opportunity",
  className = "btn btn--danger btn--block",
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (!opportunityId) return null;

  async function handleClick() {
    const title = opportunityTitle ? `“${opportunityTitle}”` : "this opportunity";
    const confirmed = window.confirm(
      `Delete ${title}?\n\nThis permanently removes the listing and all applications, saved entries, and invitations linked to it. This action cannot be undone.`,
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      await api.delete(`/api/opportunities/${opportunityId}/`);
      toast.success("Opportunity deleted.");
      if (onDeleted) {
        onDeleted(opportunityId);
      } else {
        navigate(navigateTo);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className={className} type="button" onClick={handleClick} disabled={busy}>
      {busy ? "Deleting…" : label}
    </button>
  );
}
