-- =============================================================================
-- TalentBridge Platform
-- Database schema
-- -----------------------------------------------------------------------------
-- Target : MySQL 8.0.16+ / MariaDB 10.6+
-- Storage: InnoDB, utf8mb4
-- Import : mysql -u root -p < database/schema.sql
--          or use any MySQL/MariaDB client to run this file
--
-- This file is idempotent: it drops the project tables in dependency order,
-- then recreates them. It does NOT create database users or grant privileges.
-- Create the application database user separately (see README.md).
-- =============================================================================

CREATE DATABASE IF NOT EXISTS sdg_talent
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sdg_talent;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- Drop in reverse dependency order so foreign keys never block the reset.
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS community_posts;
DROP TABLE IF EXISTS email_outbox;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS proposals;
DROP TABLE IF EXISTS project_skills;
DROP TABLE IF EXISTS freelance_projects;
DROP TABLE IF EXISTS invitations;
DROP TABLE IF EXISTS talent_project_skills;
DROP TABLE IF EXISTS talent_projects;
DROP TABLE IF EXISTS saved_opportunities;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS opportunity_skills;
DROP TABLE IF EXISTS opportunities;
DROP TABLE IF EXISTS user_sdgs;
DROP TABLE IF EXISTS sdgs;
DROP TABLE IF EXISTS user_skills;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS skill_categories;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS organizations;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- 1. IDENTITY
-- =============================================================================

CREATE TABLE users (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name          VARCHAR(120)    NOT NULL,
  email         VARCHAR(190)    NOT NULL,
  password_hash VARCHAR(255)    NOT NULL,
  role          ENUM('job_seeker','freelancer','employer','organization','admin')
                                NOT NULL DEFAULT 'job_seeker',
  status        ENUM('active','suspended') NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role_status (role, status),
  KEY idx_users_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE profiles (
  id                 INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id            INT UNSIGNED  NOT NULL,
  phone              VARCHAR(30)   NULL,
  location           VARCHAR(120)  NOT NULL,
  professional_title VARCHAR(150)  NOT NULL,
  bio                TEXT          NOT NULL,
  education          TEXT          NULL,
  experience         TEXT          NULL,
  availability       ENUM('2-5','5-10','10-20','20+') NOT NULL,
  portfolio_url      VARCHAR(255)  NULL,
  linkedin_url       VARCHAR(255)  NULL,
  is_public          TINYINT(1)    NOT NULL DEFAULT 1,
  created_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_profiles_user (user_id),
  KEY idx_profiles_location (location),
  KEY idx_profiles_availability (availability),
  KEY idx_profiles_public (is_public),
  CONSTRAINT fk_profiles_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE organizations (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  owner_user_id  INT UNSIGNED  NOT NULL,
  name           VARCHAR(160)  NOT NULL,
  slug           VARCHAR(180)  NOT NULL,
  description    TEXT          NULL,
  website        VARCHAR(255)  NULL,
  location       VARCHAR(120)  NULL,
  contact_email  VARCHAR(190)  NULL,
  is_verified    TINYINT(1)    NOT NULL DEFAULT 0,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_organizations_owner (owner_user_id),
  UNIQUE KEY uq_organizations_slug (slug),
  KEY idx_organizations_name (name),
  KEY idx_organizations_verified (is_verified),
  CONSTRAINT fk_organizations_owner
    FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 2. SKILLS AND SDGs
-- =============================================================================

CREATE TABLE skill_categories (
  id          TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(80)      NOT NULL,
  slug        VARCHAR(80)      NOT NULL,
  description VARCHAR(255)     NULL,
  sort_order  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_skill_categories_name (name),
  UNIQUE KEY uq_skill_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE skills (
  id          SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id TINYINT UNSIGNED  NOT NULL,
  name        VARCHAR(100)      NOT NULL,
  slug        VARCHAR(120)      NOT NULL,
  description VARCHAR(255)      NULL,
  created_at  TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_skills_name (name),
  UNIQUE KEY uq_skills_slug (slug),
  KEY idx_skills_category (category_id),
  CONSTRAINT fk_skills_category
    FOREIGN KEY (category_id) REFERENCES skill_categories (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sdgs (
  id          TINYINT UNSIGNED NOT NULL,
  code        VARCHAR(10)      NOT NULL,
  name        VARCHAR(120)     NOT NULL,
  description TEXT             NULL,
  color_hex   CHAR(7)          NOT NULL DEFAULT '#164A8A',
  created_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sdgs_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_skills (
  user_id    INT UNSIGNED      NOT NULL,
  skill_id   SMALLINT UNSIGNED NOT NULL,
  level      ENUM('beginner','intermediate','advanced','expert')
                               NOT NULL DEFAULT 'beginner',
  created_at TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, skill_id),
  KEY idx_user_skills_skill (skill_id),
  CONSTRAINT fk_user_skills_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_skills_skill
    FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_sdgs (
  user_id    INT UNSIGNED     NOT NULL,
  sdg_id     TINYINT UNSIGNED NOT NULL,
  created_at TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, sdg_id),
  KEY idx_user_sdgs_sdg (sdg_id),
  CONSTRAINT fk_user_sdgs_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_sdgs_sdg
    FOREIGN KEY (sdg_id) REFERENCES sdgs (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 3. OPPORTUNITIES AND APPLICATIONS
-- =============================================================================

CREATE TABLE opportunities (
  id                 INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  organization_id    INT UNSIGNED     NOT NULL,
  created_by_user_id INT UNSIGNED     NOT NULL,
  sdg_id             TINYINT UNSIGNED NULL,
  title              VARCHAR(180)     NOT NULL,
  description        TEXT             NOT NULL,
  responsibilities   TEXT             NULL,
  requirements       TEXT             NULL,
  location           VARCHAR(120)     NOT NULL,
  type               ENUM('job','internship','fellowship','volunteer','training')
                                      NOT NULL,
  category           VARCHAR(80)      NOT NULL,
  is_remote          TINYINT(1)       NOT NULL DEFAULT 0,
  deadline           DATE             NOT NULL,
  status             ENUM('draft','open','closed') NOT NULL DEFAULT 'open',
  created_at         TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_opportunities_status_deadline (status, deadline),
  KEY idx_opportunities_type (type),
  KEY idx_opportunities_location (location),
  KEY idx_opportunities_category (category),
  KEY idx_opportunities_org (organization_id),
  KEY idx_opportunities_sdg (sdg_id),
  KEY idx_opportunities_creator (created_by_user_id),
  FULLTEXT KEY ft_opportunities_search (title, description),
  CONSTRAINT fk_opportunities_org
    FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE RESTRICT,
  CONSTRAINT fk_opportunities_creator
    FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_opportunities_sdg
    FOREIGN KEY (sdg_id) REFERENCES sdgs (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE opportunity_skills (
  opportunity_id INT UNSIGNED      NOT NULL,
  skill_id       SMALLINT UNSIGNED NOT NULL,
  created_at     TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (opportunity_id, skill_id),
  KEY idx_opportunity_skills_skill (skill_id),
  CONSTRAINT fk_opportunity_skills_opportunity
    FOREIGN KEY (opportunity_id) REFERENCES opportunities (id) ON DELETE CASCADE,
  CONSTRAINT fk_opportunity_skills_skill
    FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE applications (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  opportunity_id INT UNSIGNED NOT NULL,
  user_id        INT UNSIGNED NOT NULL,
  cover_letter   TEXT         NOT NULL,
  status         ENUM('submitted','reviewing','shortlisted','rejected','hired')
                              NOT NULL DEFAULT 'submitted',
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_applications_opportunity_user (opportunity_id, user_id),
  KEY idx_applications_user_status (user_id, status),
  KEY idx_applications_opportunity_status (opportunity_id, status),
  CONSTRAINT fk_applications_opportunity
    FOREIGN KEY (opportunity_id) REFERENCES opportunities (id) ON DELETE CASCADE,
  CONSTRAINT fk_applications_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE saved_opportunities (
  user_id        INT UNSIGNED NOT NULL,
  opportunity_id INT UNSIGNED NOT NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, opportunity_id),
  KEY idx_saved_opportunities_opportunity (opportunity_id),
  CONSTRAINT fk_saved_opportunities_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_opportunities_opportunity
    FOREIGN KEY (opportunity_id) REFERENCES opportunities (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 4. TALENT PROJECTS AND INVITATIONS
-- =============================================================================

CREATE TABLE talent_projects (
  id                 INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  organization_id    INT UNSIGNED     NOT NULL,
  created_by_user_id INT UNSIGNED     NOT NULL,
  sdg_id             TINYINT UNSIGNED NULL,
  title              VARCHAR(180)     NOT NULL,
  description        TEXT             NOT NULL,
  duration           VARCHAR(60)      NOT NULL,
  location           VARCHAR(120)     NOT NULL,
  is_remote          TINYINT(1)       NOT NULL DEFAULT 0,
  talent_required    SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  deadline           DATE             NOT NULL,
  status             ENUM('open','closed') NOT NULL DEFAULT 'open',
  created_at         TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_talent_projects_org (organization_id),
  KEY idx_talent_projects_status_deadline (status, deadline),
  KEY idx_talent_projects_sdg (sdg_id),
  CONSTRAINT chk_talent_projects_required CHECK (talent_required > 0),
  CONSTRAINT fk_talent_projects_org
    FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE RESTRICT,
  CONSTRAINT fk_talent_projects_creator
    FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_talent_projects_sdg
    FOREIGN KEY (sdg_id) REFERENCES sdgs (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE talent_project_skills (
  talent_project_id INT UNSIGNED      NOT NULL,
  skill_id          SMALLINT UNSIGNED NOT NULL,
  created_at        TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (talent_project_id, skill_id),
  KEY idx_talent_project_skills_skill (skill_id),
  CONSTRAINT fk_talent_project_skills_project
    FOREIGN KEY (talent_project_id) REFERENCES talent_projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_talent_project_skills_skill
    FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invitations (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sender_user_id    INT UNSIGNED NOT NULL,
  organization_id   INT UNSIGNED NOT NULL,
  talent_user_id    INT UNSIGNED NOT NULL,
  talent_project_id INT UNSIGNED NULL,
  opportunity_id    INT UNSIGNED NULL,
  freelance_project_id INT UNSIGNED NULL,
  message           TEXT         NOT NULL,
  status            ENUM('sent','accepted','declined','withdrawn')
                                 NOT NULL DEFAULT 'sent',
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                                 ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_invitations_talent_status (talent_user_id, status),
  KEY idx_invitations_org (organization_id),
  KEY idx_invitations_created (created_at),
  KEY idx_invitations_freelance_project (freelance_project_id),
  CONSTRAINT chk_invitations_not_self CHECK (sender_user_id <> talent_user_id),
  -- At most one post can be attached; a general message has none.
  CONSTRAINT chk_invitations_single_target
    CHECK (((talent_project_id IS NOT NULL) + (opportunity_id IS NOT NULL)
            + (freelance_project_id IS NOT NULL)) <= 1),
  CONSTRAINT fk_invitations_sender
    FOREIGN KEY (sender_user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_invitations_org
    FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT fk_invitations_talent
    FOREIGN KEY (talent_user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_invitations_project
    FOREIGN KEY (talent_project_id) REFERENCES talent_projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_invitations_opportunity
    FOREIGN KEY (opportunity_id) REFERENCES opportunities (id) ON DELETE CASCADE,
  CONSTRAINT fk_invitations_freelance_project
    FOREIGN KEY (freelance_project_id) REFERENCES freelance_projects (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 5. FREELANCE PROJECTS AND PROPOSALS
-- =============================================================================

CREATE TABLE freelance_projects (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  client_user_id  INT UNSIGNED  NOT NULL,
  organization_id INT UNSIGNED  NULL,
  title           VARCHAR(180)  NOT NULL,
  description     TEXT          NOT NULL,
  budget_npr      DECIMAL(12,2) NOT NULL,
  deadline        DATE          NOT NULL,
  duration        VARCHAR(60)   NOT NULL,
  status          ENUM('open','in_progress','completed','cancelled')
                                NOT NULL DEFAULT 'open',
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_freelance_projects_client (client_user_id),
  KEY idx_freelance_projects_status_deadline (status, deadline),
  KEY idx_freelance_projects_budget (budget_npr),
  KEY idx_freelance_projects_org (organization_id),
  CONSTRAINT chk_freelance_projects_budget CHECK (budget_npr > 0),
  CONSTRAINT fk_freelance_projects_client
    FOREIGN KEY (client_user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_freelance_projects_org
    FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE project_skills (
  freelance_project_id INT UNSIGNED      NOT NULL,
  skill_id             SMALLINT UNSIGNED NOT NULL,
  created_at           TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (freelance_project_id, skill_id),
  KEY idx_project_skills_skill (skill_id),
  CONSTRAINT fk_project_skills_project
    FOREIGN KEY (freelance_project_id) REFERENCES freelance_projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_project_skills_skill
    FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE proposals (
  id                   INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  freelance_project_id INT UNSIGNED  NOT NULL,
  freelancer_user_id   INT UNSIGNED  NOT NULL,
  bid_amount           DECIMAL(12,2) NOT NULL,
  delivery_days        SMALLINT UNSIGNED NOT NULL,
  cover_letter         TEXT          NOT NULL,
  relevant_skills      VARCHAR(255)  NOT NULL,
  portfolio_url        VARCHAR(255)  NULL,
  status               ENUM('submitted','shortlisted','accepted','rejected','withdrawn')
                                     NOT NULL DEFAULT 'submitted',
  created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                     ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_proposals_project_freelancer (freelance_project_id, freelancer_user_id),
  KEY idx_proposals_freelancer_status (freelancer_user_id, status),
  KEY idx_proposals_project_status (freelance_project_id, status),
  CONSTRAINT chk_proposals_bid CHECK (bid_amount > 0),
  CONSTRAINT chk_proposals_delivery CHECK (delivery_days > 0),
  CONSTRAINT fk_proposals_project
    FOREIGN KEY (freelance_project_id) REFERENCES freelance_projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_proposals_freelancer
    FOREIGN KEY (freelancer_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 6. NOTIFICATIONS AND EMAIL OUTBOX
-- =============================================================================

CREATE TABLE notifications (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED    NOT NULL,
  type       VARCHAR(40)     NOT NULL,
  title      VARCHAR(160)    NOT NULL,
  message    VARCHAR(500)    NOT NULL,
  link       VARCHAR(255)    NULL,
  is_read    TINYINT(1)      NOT NULL DEFAULT 0,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_user_read_created (user_id, is_read, created_at),
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per outbound email. Rows are inserted in the same transaction as the
-- matching notification, then delivered after the commit (or by the CLI
-- worker). Keeping a queue makes retries and failure inspection possible.
CREATE TABLE email_outbox (
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

-- =============================================================================
-- 7. COMMUNITY
-- =============================================================================

CREATE TABLE community_posts (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED NOT NULL,
  title          VARCHAR(180) NOT NULL,
  body           MEDIUMTEXT   NOT NULL,
  type           ENUM('discussion','announcement','event','resource')
                              NOT NULL DEFAULT 'discussion',
  event_date     DATETIME     NULL,
  event_location VARCHAR(160) NULL,
  resource_url   VARCHAR(255) NULL,
  status         ENUM('published','hidden') NOT NULL DEFAULT 'published',
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_community_posts_status_created (status, created_at),
  KEY idx_community_posts_type (type),
  KEY idx_community_posts_user (user_id),
  CONSTRAINT fk_community_posts_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE comments (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id    INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  body       TEXT         NOT NULL,
  status     ENUM('visible','hidden') NOT NULL DEFAULT 'visible',
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                          ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_comments_post_status_created (post_id, status, created_at),
  KEY idx_comments_user (user_id),
  CONSTRAINT fk_comments_post
    FOREIGN KEY (post_id) REFERENCES community_posts (id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- End of schema
-- =============================================================================
