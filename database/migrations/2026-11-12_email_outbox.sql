-- =============================================================================
-- Migration: add the email outbox
-- -----------------------------------------------------------------------------
-- Run this once against an existing sdg_talent database so email notifications
-- work without re-importing schema.sql (which would reset the demo data).
--
--   mysql -u root -p sdg_talent < database/migrations/2026-11-12_email_outbox.sql
--
-- Fresh installs get this table automatically from database/schema.sql.
-- The statement is idempotent (CREATE TABLE IF NOT EXISTS).
-- =============================================================================

USE sdg_talent;

CREATE TABLE IF NOT EXISTS email_outbox (
  id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED     NULL,
  recipient_email VARCHAR(190)     NOT NULL,
  recipient_name  VARCHAR(120)     NULL,
  subject         VARCHAR(190)     NOT NULL,
  body_html       MEDIUMTEXT       NOT NULL,
  body_text       MEDIUMTEXT       NOT NULL,
  status          ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
  attempts        TINYINT UNSIGNED NOT NULL DEFAULT 0,
  last_error      VARCHAR(500)     NULL,
  created_at      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at         TIMESTAMP        NULL,
  PRIMARY KEY (id),
  KEY idx_email_outbox_status_created (status, created_at),
  KEY idx_email_outbox_user (user_id),
  CONSTRAINT fk_email_outbox_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
