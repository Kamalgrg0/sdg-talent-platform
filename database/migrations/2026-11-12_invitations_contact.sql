-- =============================================================================
-- Migration: enable direct employer invitations and general messages
-- -----------------------------------------------------------------------------
-- Run this once against an existing sdg_talent database:
--
--   mysql -u root -p sdg_talent < database/migrations/2026-11-12_invitations_contact.sql
--
-- It lets an employer or organization invite a public talent profile to one of
-- their open opportunities or freelance projects, or send a general message
-- that is not tied to a post.
--
-- Fresh installs get the same shape automatically from database/schema.sql.
-- The statements are one-time changes: do not run this file twice.
-- =============================================================================

USE sdg_talent;

-- 1. A freelance project can now be the subject of an invitation.
ALTER TABLE invitations
  ADD COLUMN freelance_project_id INT UNSIGNED NULL AFTER opportunity_id;

-- 2. The old rule required a post. General messages are allowed now, so replace
--    it with a rule that still prevents attaching more than one post.
ALTER TABLE invitations
  DROP CHECK chk_invitations_has_target;

ALTER TABLE invitations
  ADD CONSTRAINT chk_invitations_single_target
    CHECK (((talent_project_id IS NOT NULL) + (opportunity_id IS NOT NULL)
            + (freelance_project_id IS NOT NULL)) <= 1);

-- 3. Referential integrity for the new target.
ALTER TABLE invitations
  ADD CONSTRAINT fk_invitations_freelance_project
    FOREIGN KEY (freelance_project_id) REFERENCES freelance_projects (id) ON DELETE CASCADE;
