# TalentBridge — Requirements

| Item | Value |
|---|---|
| Document version | 1.0 |
| Date | 2026-10-29 |
| Project | TalentBridge |
| Stack | Django 5 + Django REST Framework, React 18 + Vite, MySQL 8.x / MariaDB 10.6+ |
| Status | Implemented (Django + React) |

---

## 1. Problem statement

Nepal has a large and growing number of students, graduates, freelancers, volunteers, and early-career professionals who want to gain experience and contribute to sustainable development. At the same time, development organizations, social enterprises, and employers struggle to find verified, relevant talent and to advertise internships, fellowships, volunteering, training, and short paid projects.

Opportunities are currently scattered across social media posts, personal networks, and closed mailing lists. This creates four problems:

1. **Discovery is fragmented.** Talent cannot compare opportunities in one place, and organizations cannot reach a broad talent pool.
2. **Skills are invisible.** Students and freelancers have no simple, structured way to present skills, SDG interests, availability, and portfolios.
3. **Matching is manual.** Organizations have no lightweight tool to search talent by skill, SDG interest, location, or availability, or to invite candidates to projects.
4. **Digital livelihood pathways are unclear.** Information about grants, funding, entrepreneurship, and financial literacy is hard to find and rarely connected to real opportunities.

The platform addresses these problems with a single web application that combines an opportunity board, a talent directory, a freelance project board, an organization workspace, and a community knowledge space.

---

## 2. Objectives

### 2.1 General objective

Design and build a working, secure, responsive web platform that connects talent with sustainable-development opportunities and organizations, using a Django REST API, a React single-page application, and MySQL/MariaDB.

### 2.2 Specific objectives

1. Provide a searchable, filterable catalogue of jobs, internships, fellowships, volunteer roles, and training opportunities.
2. Provide a public talent directory in which people can showcase skills, SDG interests, availability, and portfolio links without exposing private contact data.
3. Allow employers and organizations to post opportunities, post talent projects, search talent, and invite candidates through the platform.
4. Allow freelancers to discover paid projects and submit proposals that are stored and managed securely.
5. Provide a rule-based skill recommendation feature that helps users identify complementary skills, clearly labelled as rule-based rather than an AI model.
6. Provide role-specific dashboards so each user sees only the data they are allowed to see.
7. Provide an administrator workspace for user, content, and community management with platform statistics.
8. Apply authentication, authorization, CSRF protection, input validation, prepared statements, and output escaping consistently.
9. Document the requirements, use cases, ER model, architecture, setup, and testing so the project can be evaluated and maintained by a beginner developer.

---

## 3. Stakeholders and actors

| Actor | Description | Primary goals |
|---|---|---|
| Visitor | Unauthenticated user | Browse opportunities, talent, freelance projects, and community content |
| Job seeker | Registered talent-side user | Build a profile, apply for opportunities, save opportunities, join the talent pool |
| Freelancer | Registered talent-side user | Showcase skills, submit proposals, track proposals, join the talent pool |
| Employer | Registered organization-side user | Post opportunities, review applicants, shortlist candidates, invite talent |
| Organization | Registered organization-side user | Maintain an organization profile, post projects and opportunities, invite talent |
| Administrator | Internal privileged user | Manage users, content, applications, projects, and community; view statistics |
| Mentor / Volunteer / Researcher | Personas within job-seeker or freelancer accounts | Join the talent pool and contribute to projects |
| Client | Capability of an employer or organization account | Publish freelance projects and manage proposals |
| Internship supervisor / evaluator | Academic assessor | Review documentation, source code, and working demo |

> **Design note:** "Client" is not a separate registration role. Employer and organization accounts can publish freelance projects. This keeps the four public account types required by the brief and avoids a fifth, under-used role.

---

## 4. Scope

### 4.1 In scope

- 16 public pages listed in the brief.
- Four public account types: job seeker, freelancer, employer, organization.
- Secure session authentication and role-based authorization.
- Administrator accounts created only through a Django management command.
- Opportunity search, filtering, pagination, details, apply, and save.
- Talent directory, public profiles, join-talent-pool form, invitations.
- Talent project posting by authorized organization-side accounts.
- Skills catalogue, search, and a rule-based recommendation engine.
- Freelance project listings, details, proposal submission, and proposal management.
- Organization/enterprise workspace and organization profile.
- Community posts, events, resources, and comments with moderation.
- In-app notifications, with optional email delivery through SMTP.
- Role dashboards for job seeker, freelancer, employer, organization, and administrator.
- Complete SQL schema and seed data.
- Documentation and testing evidence.

### 4.2 Out of scope (explicitly excluded)

| Excluded item | Reason |
|---|---|
| Real payments, escrow, invoices, money transfers | Financial licensing and PCI-DSS concerns; the brief forbids real transactions |
| Real AI/LLM model | The brief requires a clearly labelled rule-based recommender; the logic will be modular so an API can be added later |
| File uploads (CVs, avatars, logos) | Not required by the brief; avoids upload-security risks in v1 |
| Mobile native apps | Web-only scope |
| Real-time chat / WebSockets | Not implemented; messaging is request/response over HTTP |
| Multi-organization membership per account | One owner organization per employer/organization account in v1 |
| Password reset via email | Requires SMTP; administrator-assisted reset documented as a future enhancement |
| Public API for third parties | Internal JSON endpoints only |

### 4.3 Assumptions

1. The platform runs as one Django process plus one MySQL/MariaDB server, not a distributed cluster.
2. Users have a modern browser with JavaScript enabled; the React SPA calls the JSON API for data and writes.
3. Time zone is `Asia/Kathmandu`; all timestamps are stored in UTC and displayed in local time.
4. Currency is Nepalese Rupees (NPR), stored as `DECIMAL(12,2)`.
5. Sample records in the seed file are demo data and contain no real personal data.
6. The reference site is used only for information architecture and visual inspiration; no source code or database is copied.

---

## 5. Functional requirements

Requirement IDs are referenced by use cases and tests. Priority: **M** = must have, **S** = should have, **C** = could have.

### 5.1 Public site and content

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | The home page shall show a hero, live platform statistics, featured opportunities, selected SDGs, a five-step "how it works" section, and a call to action. | M |
| FR-02 | The home page statistics shall be counted from the database (talent profiles, open opportunities, organizations, projects), not hard-coded in HTML. | M |
| FR-03 | Every public page shall use the shared header, navigation, and footer. | M |
| FR-04 | Navigation shall collapse into an accessible mobile menu controlled by React. | M |
| FR-05 | The enterprise page shall explain organization capabilities and link to registration, profile management, opportunity posting, talent search, applicant management, and project management. | M |

### 5.2 Opportunities

| ID | Requirement | Priority |
|---|---|---|
| FR-07 | The opportunities page shall list open opportunities with title, organization, location, type, skills, and deadline. | M |
| FR-08 | Users shall be able to filter by keyword, location, type, category, skill, SDG, and deadline, individually or in combination. | M |
| FR-09 | Filtering shall be applied on the server by the JSON API so results are correct regardless of client state. | M |
| FR-10 | Results shall be paginated with a stable order and a visible page count. | M |
| FR-11 | The details page shall show description, responsibilities, requirements, skills, location, employment type, deadline, SDG category, organization, and status. | M |
| FR-12 | An authenticated job seeker or freelancer shall be able to apply with a cover letter. | M |
| FR-13 | The database shall prevent a second application by the same user to the same opportunity (`UNIQUE(user_id, opportunity_id)`). | M |
| FR-14 | Applications to closed or expired opportunities shall be rejected server-side. | M |
| FR-15 | An authenticated job seeker or freelancer shall be able to save and unsave an opportunity. | M |
| FR-16 | Employers and organizations shall be able to create, edit, close, reopen, and delete their own opportunities. | M |
| FR-17 | An employer shall see applicants for their own opportunities and update application status (submitted, reviewing, shortlisted, offered, rejected, hired). | M |

### 5.3 Talent

| ID | Requirement | Priority |
|---|---|---|
| FR-18 | The talent page shall show the hero, talent journey, search/filter panel, talent cards, and "who can join" sections. | M |
| FR-19 | Visitors shall be able to search talent by name, skill, SDG interest, availability, and location. | M |
| FR-20 | Talent cards and public profiles shall expose only public fields; email, phone, and private notes shall never be rendered publicly. | M |
| FR-21 | Authenticated job seekers and freelancers shall be able to create or update a talent profile with all fields listed in the brief. | M |
| FR-22 | Required fields shall be validated on the client and again on the server; the server is authoritative. | M |
| FR-23 | Employers, organizations, and administrators shall be able to invite a talent profile to a project or opportunity, with a message. | M |
| FR-24 | The system shall prevent invitations to arbitrary user IDs, to oneself, or by unauthorized roles. | M |
| FR-25 | Employers and organizations shall be able to post a talent project with the fields listed in the brief. | M |
| FR-26 | Only the owning organization or an administrator shall be able to edit or close a talent project. | M |

### 5.4 Skills

| ID | Requirement | Priority |
|---|---|---|
| FR-27 | The skills page shall list skill categories and searchable skills. | M |
| FR-28 | The skills page shall provide rule-based recommendations based on selected interests or skills. | M |
| FR-29 | The interface shall clearly label recommendations as rule-based, not machine learning or AI. | M |
| FR-30 | Recommendation rules shall live in one dedicated module so a real service can replace the rule source later. | M |

### 5.5 Freelance

| ID | Requirement | Priority |
|---|---|---|
| FR-31 | The freelance page shall list open projects with title, client/organization, description, skills, budget in NPR, deadline, and duration. | M |
| FR-32 | The freelance listing shall support keyword, skill, and budget filtering with pagination. | S |
| FR-33 | The project details page shall show full project information and the proposal form for eligible freelancers. | M |
| FR-34 | Authenticated freelancers shall be able to submit a proposal with bid amount, delivery time, cover letter, skills, and portfolio URL. | M |
| FR-35 | The database shall prevent duplicate proposals (`UNIQUE(freelance_project_id, freelancer_user_id)`). | M |
| FR-36 | Only the client who owns a project or an administrator shall view its proposals or change project state. | M |
| FR-37 | Freelancers shall see only their own proposals in their dashboard. | M |

### 5.6 Enterprise and organizations

| ID | Requirement | Priority |
|---|---|---|
| FR-38 | Employer and organization registration shall create a linked organization record owned by the account. | M |
| FR-39 | Organization-side users shall be able to edit the organization profile (name, description, website, location, contact email). | M |
| FR-40 | An organization profile shall never be editable by a different account, even by changing an ID in the URL. | M |
| FR-41 | Administrators shall be able to verify or unverify an organization. | S |

### 5.7 Community

| ID | Requirement | Priority |
|---|---|---|
| FR-42 | The community page shall list published posts of type discussion, announcement, event, and resource. | M |
| FR-43 | Authenticated users shall be able to create discussion, event, and resource posts; announcements shall be administrator-only. | M |
| FR-44 | Authenticated users shall be able to comment on published posts. | M |
| FR-45 | Authors shall be able to edit or delete their own posts; administrators shall be able to hide any post or comment. | M |
| FR-46 | Event posts shall support an optional event date and location; resource posts shall support an optional URL. | S |

### 5.8 Authentication and accounts

| ID | Requirement | Priority |
|---|---|---|
| FR-47 | Public registration shall support name, email, password, password confirmation, and account type (job seeker, freelancer, employer, organization). | M |
| FR-48 | The public registration endpoint shall ignore or reject any attempt to register as administrator. | M |
| FR-49 | Email addresses shall be unique (case-insensitive) and validated server-side. | M |
| FR-50 | Passwords shall be at least 8 characters and hashed by Django's password hashers; plain text shall never be stored or logged. | M |
| FR-51 | Login shall verify the stored hash, use generic error messages, and create a fresh session on success. | M |
| FR-52 | Logout shall be a POST request protected by CSRF and shall destroy the session completely. | M |
| FR-53 | All private pages shall require authentication and the correct role, checked on the server before any data is read. | M |
| FR-54 | Suspended accounts shall be denied login and shall have active sessions invalidated on their next request. | M |
| FR-55 | Administrator accounts shall be created only by `manage.py create_admin`. | M |
| FR-56 | The system shall support CSRF tokens on every state-changing form, including JSON requests. | M |
| FR-57 | A basic login throttle shall slow repeated failed attempts without locking out legitimate users permanently. | S |

### 5.9 Dashboards and administration

| ID | Requirement | Priority |
|---|---|---|
| FR-58 | The router shall send each authenticated user to the dashboard for their role. | M |
| FR-59 | The job-seeker dashboard shall show profile completeness, applications and statuses, saved opportunities, and recommended open opportunities. | M |
| FR-60 | The freelancer dashboard shall show profile, proposals and statuses, and accepted/active projects. | M |
| FR-61 | The employer dashboard shall show posted opportunities, applicant counts, offers sent/accepted/declined, and management links. | M |
| FR-62 | The organization dashboard shall show organization profile status, talent projects, invitations, posted opportunities, and freelance projects. | M |
| FR-63 | The administrator dashboard shall show counts for users, talent, opportunities, organizations, projects, applications, and community posts. | M |
| FR-64 | Administrators shall be able to list, search, suspend/reactivate users, and change non-admin roles where valid. | M |
| FR-65 | Administrators shall be able to moderate opportunities, talent profiles, organizations, projects, applications, posts, and comments. | M |
| FR-66 | Every dashboard query shall be scoped by the authenticated user or organization; changing an ID parameter shall not reveal another user's data. | M |
| FR-67 | Notifications shall be generated for application status changes, offers, messages, invitations, proposal status changes, and moderation actions, and shown only to the recipient. | S |

### 5.10 Frontend/backend integration

| ID | Requirement | Priority |
|---|---|---|
| FR-68 | Pages shall be rendered by React; Django shall serve the built SPA and the JSON API. | M |
| FR-69 | Live filtering and skill recommendations shall use the API client against JSON endpoints that return a consistent envelope. | S |
| FR-70 | JSON endpoints shall enforce authentication, authorization, validation, and CSRF on every state-changing call. | M |
| FR-71 | All user-supplied output shall be escaped by React; no unescaped interpolation of database content into HTML. | M |
| FR-72 | All database access shall use the Django ORM with parameterised queries; no string concatenation of user input into SQL. | M |

### 5.11 Messaging and offers

| ID | Requirement | Priority |
|---|---|---|
| FR-73 | A member shall be able to start a conversation with another active member and exchange messages; each message shall create an in-app notification and an email for the recipient. | M |
| FR-74 | An employer shall be able to move an application to "Offer sent"; the candidate shall see the offer on their dashboard. | M |
| FR-75 | A candidate shall be able to accept or decline an offer; the employer shall receive an in-app notification and an email with the outcome. | M |

---

## 6. Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Security | Passwords hashed; sessions regenerated; HttpOnly + SameSite cookies; CSRF on all state changes; prepared statements; output escaping; strict server-side authorization. |
| NFR-02 | Security | Private configuration (`backend/.env`) is git-ignored. Database credentials never appear in JavaScript. |
| NFR-03 | Performance | Every list is paginated (default 9–12 items). Filter columns and foreign keys are indexed. Typical pages should render in under 500 ms on local hardware with seed data. |
| NFR-04 | Usability | Responsive from 320 px to 1920 px; mobile navigation with keyboard support; visible focus states; consistent spacing and typography. |
| NFR-05 | Accessibility | Semantic landmarks, one `h1` per page, labelled inputs, error messages associated with fields, colour contrast of at least 4.5:1 for body text, no colour-only status indication. |
| NFR-06 | Compatibility | Django 5, React 18 and Vite 5; MySQL 8.0+ and MariaDB 10.6+; current Chrome, Firefox, Edge, Safari. |
| NFR-07 | Maintainability | Small single-purpose Django apps and React components, descriptive names, shared helpers, comments only where logic is not obvious. |
| NFR-08 | Privacy | Public talent views never expose email, phone, or private notes. Contact occurs through authenticated invitations/applications. |
| NFR-09 | Integrity | InnoDB, `utf8mb4`, foreign keys, `UNIQUE` constraints for duplicate prevention, `CHECK` constraints where supported, transactions for multi-table writes. |
| NFR-10 | Reliability | Multi-row writes (e.g. profile + skills + SDGs, project + skills) use transactions and roll back on failure. |
| NFR-11 | Observability | Application errors are logged by Django; users see friendly messages without stack traces. |
| NFR-12 | Portability | Environment-specific values come from `backend/.env`; the same code runs against MySQL or MariaDB. |
| NFR-13 | Legal/ethical | No real payments, no scraped personal data, demo seed data, and the rule-based recommender is labelled honestly. |
| NFR-14 | Constraint | No real payments, file uploads, or third-party runtime services in v1. |

---

## 7. Business rules

| ID | Rule |
|---|---|
| BR-01 | A user may apply only once per opportunity; enforced by a unique database constraint, not only by the API. |
| BR-02 | A freelancer may submit only one proposal per project; enforced by a unique constraint. |
| BR-03 | Applications are rejected when the opportunity is not `open` or its deadline has passed. |
| BR-04 | Only job-seeker and freelancer accounts may apply for opportunities, save opportunities, join the talent pool, or submit proposals. |
| BR-05 | Only employer, organization, and administrator accounts may post opportunities, talent projects, freelance projects, or send invitations. |
| BR-06 | An employer/organization account owns exactly one organization profile. |
| BR-07 | Users may only edit or delete records they own; administrators may moderate any record. |
| BR-08 | A user cannot invite themselves, and cannot target an arbitrary user ID — the recipient is resolved from a public talent profile ID. |
| BR-09 | Public profile pages never expose private contact fields. |
| BR-10 | Announcements are administrator-only; discussions, events, and resources are open to authenticated users. |
| BR-11 | Suspended users cannot log in and are logged out on their next authenticated request. |
| BR-12 | Administrator role cannot be self-assigned through registration or profile editing. |
| BR-13 | The platform never processes payments or offers financial services. |
| BR-14 | Deleted users cascade-delete their profiles, skills links, SDG links, applications, saved items, proposals, notifications, comments, and owned posts, but **not** organizations or projects that contain historical records; those are retained and ownership must be reassigned or the account suspended instead. |
| BR-15 | Every POST, PUT-like, and DELETE-like action requires a valid CSRF token; failures return HTTP 403. |

> **Deletion policy detail:** `organizations.owner_user_id` uses `ON DELETE RESTRICT`. An administrator must reassign or archive an organization before deleting its owner. This protects opportunity/application history.

---

## 8. Role permission matrix

Legend: ✓ allowed, — denied, ◐ allowed for own records only, ★ administrator override.

| Capability | Visitor | Job seeker | Freelancer | Employer | Organization | Admin |
|---|---|---|---|---|---|---|
| Browse public pages | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Register / login | ✓ | — | — | — | — | — |
| Join talent pool / edit talent profile | — | ✓ | ✓ | — | — | ★ |
| Apply / save opportunity | — | ✓ | ✓ | — | — | — |
| Post opportunity | — | — | — | ◐ | ◐ | ★ |
| View applicants / update status | — | — | — | ◐ | ◐ | ★ |
| Post talent project | — | — | — | ◐ | ◐ | ★ |
| Invite talent | — | — | — | ◐ | ◐ | ★ |
| Post freelance project / view its proposals | — | — | — | ◐ | ◐ | ★ |
| Submit proposal | — | — | ✓ | — | — | — |
| Create community post | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Comment | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Moderate content | — | — | — | — | — | ✓ |
| Manage users / organizations | — | — | — | — | — | ✓ |
| View role dashboard | — | own | own | own | own | own |
| Access another user's dashboard data | — | — | — | — | — | ★ (audit views only) |

---

## 9. Acceptance criteria

The project is accepted when all of the following are demonstrated on a clean database:

1. `schema.sql` imports without errors; `manage.py seed_demo` loads the demo rows from `seed.sql`.
2. A visitor can browse home, opportunities, talent, freelance, community, and enterprise pages without logging in.
3. A new job seeker can register, log in, complete a talent profile, and appear in the talent directory without exposing email or phone.
4. A job seeker can apply once; a second attempt is blocked with a friendly message and no duplicate row exists.
5. A freelancer can submit one proposal; a second attempt is blocked; another freelancer can still propose.
6. An employer can post an opportunity and see only their own applicants; another employer cannot.
7. An employer cannot open another organization's project proposals by editing the URL.
8. A non-admin cannot reach `/django-admin/` and is redirected or shown HTTP 403.
9. A registration attempt with `role=admin` still creates a non-admin account or is rejected; no admin is created.
10. Logout requires a POST with a valid CSRF token and destroys the session.
11. All forms re-display validation errors and preserve safe input values.
12. SQL injection strings are stored as literal text and cause no query error.
13. Script tags submitted in community posts render as text, not executable script.
14. A POST without a valid CSRF token is rejected with HTTP 403.
15. The layout works at 360 px, 768 px, and 1280 px widths.
16. No link points to a missing page or asset (link crawl is clean).
17. `manage.py check`, `makemigrations --check --dry-run` and `npm run build` all pass.
18. The platform contains no payment form or transaction endpoint.
19. Skill recommendations are labelled rule-based and change predictably with the selected skill.
20. README allows a second person to install the project from scratch.

---

## 10. Glossary

| Term | Meaning |
|---|---|
| SDG | Sustainable Development Goal — one of the 17 United Nations goals |
| Talent pool | Searchable directory of people who opted in to be discovered |
| Talent project | A time-bound, often unpaid or stipend-based project for students, volunteers, or researchers |
| Freelance project | A paid short-term project with a budget in NPR and a proposal process |
| Proposal | A freelancer's bid, delivery estimate, cover letter, and portfolio reference |
| Invitation | A message from an organization to a talent profile about a project or opportunity |
| Capability | An action a role is allowed to perform, checked on the server |
| CSRF | Cross-Site Request Forgery — an attack prevented by per-session tokens |
| XSS | Cross-Site Scripting — prevented by escaping all output |
| Rule-based recommender | Deterministic if/then skill suggestions, not a trained model |
| Public field | A profile field safe to display to anonymous visitors |

---

## 11. Traceability

- Use cases: `docs/use-cases.md` (each use case lists the FR IDs it satisfies).
- Data model: `docs/er-diagram.md`.
- Architecture and security controls: `docs/architecture.md`.
- Verification commands: `docs/architecture.md` section 12 and the root `README.md`.
- Setup instructions: root `README.md`.
