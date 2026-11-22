-- =============================================================================
-- TalentBridge Platform
-- Sample data (demo records)
-- -----------------------------------------------------------------------------
-- Import AFTER schema.sql:
--   mysql -u root -p sdg_talent < database/seed.sql
--   or a database client -> select sdg_talent -> Import -> this file
--
-- Demo password for every sample account: DemoPass123!
-- The hashes below are bcrypt hashes for the seeded demo accounts.
-- These are demonstration accounts only. Do not reuse this password anywhere.
-- =============================================================================

USE sdg_talent;
SET NAMES utf8mb4;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE comments;
TRUNCATE TABLE community_posts;
TRUNCATE TABLE email_outbox;
TRUNCATE TABLE notifications;
TRUNCATE TABLE proposals;
TRUNCATE TABLE project_skills;
TRUNCATE TABLE freelance_projects;
TRUNCATE TABLE invitations;
TRUNCATE TABLE talent_project_skills;
TRUNCATE TABLE talent_projects;
TRUNCATE TABLE saved_opportunities;
TRUNCATE TABLE applications;
TRUNCATE TABLE opportunity_skills;
TRUNCATE TABLE opportunities;
TRUNCATE TABLE user_sdgs;
TRUNCATE TABLE sdgs;
TRUNCATE TABLE user_skills;
TRUNCATE TABLE skills;
TRUNCATE TABLE skill_categories;
TRUNCATE TABLE profiles;
TRUNCATE TABLE organizations;
TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- USERS (demo accounts, @example.com)
-- =============================================================================

INSERT INTO users (id, name, email, password_hash, role, status) VALUES
(1,  'Aashish Sharma',   'aashish.sharma@example.com',   '$2y$10$33aK38xBqresRYbfGs8Wmu9bjoKJIR8OjLsoPp7zUO7308hQGEwmS', 'job_seeker',   'active'),
(2,  'Priya Gurung',     'priya.gurung@example.com',     '$2y$10$NBMT.d3lbVqImeJ3nlcrAecfGpDI7Y1YQqKJuHbzbE65Msy89gkt6', 'freelancer',   'active'),
(3,  'Ramesh Thapa',     'ramesh.thapa@example.com',     '$2y$10$8zr1o63E6AiD7FT7np4ZFOPtWFaMW06orKOtefrUEH2ZXbXRcUnQ.', 'employer',     'active'),
(4,  'Sunita Karki',     'sunita.karki@example.com',     '$2y$10$9nIuZVzJQ.HvYwGBRPGIY.kmVmMOJwi8tp.jnhfsOp0yKn1/JgI9.', 'organization', 'active'),
(5,  'Bikash Adhikari',  'bikash.adhikari@example.com',  '$2y$10$HgEBe8DxusptUOvjb.3QE.462AohAU4LDg5d.VpH1ZTQNH0hp3olG', 'job_seeker',   'active'),
(6,  'Anisha Rai',       'anisha.rai@example.com',       '$2y$10$rOsdmwkbBxqTyhxxhHODG.2A8goewnyW3TxRdvZF8bsGnSBC2Zhhy', 'freelancer',   'active'),
(7,  'Deepak Shrestha',  'deepak.shrestha@example.com',  '$2y$10$s0R.CtOsU6kV2z5eb.N7qOtRkmK7myTkU2xGaK2ShVpw8pn2WmaMW', 'employer',     'active'),
(8,  'Maya Tamang',      'maya.tamang@example.com',      '$2y$10$ETpPkGQa3.XDQT.U6DAO2OKI/eGpE62t18IaTN5BOg66awgZiXbhC', 'organization', 'active'),
(9,  'Sita Poudel',      'sita.poudel@example.com',      '$2y$10$fnEEdetLJRkqi0dB4IISs.ZAdFDwCA1MV1rdYdl.utMvxHkSKVSg.', 'job_seeker',   'active'),
(10, 'Nabin Joshi',      'nabin.joshi@example.com',      '$2y$10$s6.YvL2qUI3IhaDqSReFqufvKi8LDhuY6fMcqC7ie7/VEoKfPB.xC', 'freelancer',   'active'),
(11, 'Kiran Bhandari',   'kiran.bhandari@example.com',   '$2y$10$bSZKspNW0w4ZCWNREKR7c.QQfyewCTKbuVdMBrKalt.uMZNhhj5qi', 'job_seeker',   'active'),
(12, 'Puja Limbu',       'puja.limbu@example.com',       '$2y$10$Pw.ykOBuNNsbfTMNknUdiurJTm/XFsauKYQXLpJoYYsam/aPqBq7K', 'freelancer',   'active');

-- =============================================================================
-- ORGANIZATIONS (demo records)
-- =============================================================================

INSERT INTO organizations
  (id, owner_user_id, name, slug, description, website, location, contact_email, is_verified)
VALUES
(1, 4, 'Green Himalaya Foundation', 'green-himalaya-foundation',
 'A non-profit working on climate resilience, community forests, and green livelihoods across Nepal.',
 'https://green-himalaya.example.org', 'Kathmandu', 'info@green-himalaya.example.org', 1),
(2, 8, 'Digital Skills Nepal', 'digital-skills-nepal',
 'A social enterprise that runs digital literacy programmes for students, women, and rural communities.',
 'https://digital-skills.example.org', 'Pokhara', 'hello@digital-skills.example.org', 1),
(3, 3, 'Sahayatri Cooperative', 'sahayatri-cooperative',
 'A savings and credit cooperative supporting micro-entrepreneurs and financial literacy.',
 'https://sahayatri.example.org', 'Biratnagar', 'contact@sahayatri.example.org', 0),
(4, 7, 'Kathmandu Innovation Lab', 'kathmandu-innovation-lab',
 'A technology lab building open data tools and digital products for public-good organisations.',
 'https://ktm-innovation.example.org', 'Lalitpur', 'team@ktm-innovation.example.org', 1);

-- =============================================================================
-- TALENT PROFILES
-- =============================================================================

INSERT INTO profiles
  (id, user_id, phone, location, professional_title, bio, education, experience,
   availability, portfolio_url, linkedin_url, is_public)
VALUES
(1, 1, '+977-9800000001', 'Kathmandu', 'Junior Web Developer',
 'I build small PHP and JavaScript applications and want to grow into a full-stack developer.',
 'BSc Computer Science (in progress), Tribhuvan University',
 'Two personal projects and a three-month web development internship.',
 '10-20', 'https://example.com/portfolio/aashish', 'https://example.com/linkedin/aashish', 1),
(2, 2, '+977-9800000002', 'Pokhara', 'Freelance Graphic Designer',
 'I design clear, accessible visuals for non-profits, campaigns, and small businesses.',
 'Diploma in Graphic Design, Pokhara',
 'Five years of freelance design for local organisations and social campaigns.',
 '20+', 'https://example.com/portfolio/priya', 'https://example.com/linkedin/priya', 1),
(3, 5, '+977-9800000003', 'Biratnagar', 'Data Analyst (Student)',
 'I enjoy turning spreadsheets into useful stories and I am learning SQL and Python.',
 'BBA (in progress), Purbanchal University',
 'Part-time data entry and reporting assistant for a local cooperative.',
 '5-10', 'https://example.com/portfolio/bikash', NULL, 1),
(4, 6, '+977-9800000004', 'Lalitpur', 'Content Writer and Translator',
 'I write plain-language content in English and Nepali for education and gender programmes.',
 'BA English, Kathmandu University',
 'Four years of freelance writing, translation, and social media support.',
 '10-20', 'https://example.com/portfolio/anisha', 'https://example.com/linkedin/anisha', 1),
(5, 9, '+977-9800000005', 'Kathmandu', 'Community Health Volunteer',
 'I organise neighbourhood health campaigns and want to support gender and poverty programmes.',
 'Certificate in Public Health, CTEVT',
 'Three years of community volunteering with a local health post.',
 '2-5', NULL, NULL, 1),
(6, 10, '+977-9800000006', 'Pokhara', 'Mobile App Developer',
 'I build small cross-platform apps and care about simple, accessible user experiences.',
 'BSc Computer Science, Pokhara University',
 'Freelance mobile development for two local startups.',
 '10-20', 'https://example.com/portfolio/nabin', 'https://example.com/linkedin/nabin', 1),
(7, 11, '+977-9800000007', 'Biratnagar', 'Environmental Researcher',
 'I research air quality and land use, and I am learning GIS for community mapping.',
 'MSc Environmental Science, Tribhuvan University',
 'Research assistant on two university-led environmental studies.',
 '5-10', 'https://example.com/portfolio/kiran', NULL, 1),
(8, 12, '+977-9800000008', 'Lalitpur', 'Digital Marketing Freelancer',
 'I help mission-driven organisations reach the right people with honest, useful content.',
 'BBA Marketing, Kathmandu University',
 'Three years of freelance digital marketing and social media management.',
 '20+', 'https://example.com/portfolio/puja', 'https://example.com/linkedin/puja', 1);

-- =============================================================================
-- SKILL CATEGORIES AND SKILLS
-- =============================================================================

INSERT INTO skill_categories (id, name, slug, description, sort_order) VALUES
(1, 'Technical', 'technical', 'Software development, systems, and infrastructure skills.', 1),
(2, 'Business', 'business', 'Business planning, sales, and accounting skills.', 2),
(3, 'Creative', 'creative', 'Design, media production, and visual communication skills.', 3),
(4, 'Communication', 'communication', 'Writing, speaking, translation, and community engagement skills.', 4),
(5, 'Digital', 'digital', 'Digital marketing, data tools, and everyday office software skills.', 5),
(6, 'Management', 'management', 'Planning, people, operations, and leadership skills.', 6),
(7, 'Research', 'research', 'Evidence, analysis, mapping, and policy skills.', 7);

INSERT INTO skills (id, category_id, name, slug, description) VALUES
(1,  1, 'PHP', 'php', 'Server-side web development with PHP.'),
(2,  1, 'JavaScript', 'javascript', 'Interactive browser behaviour and web application logic.'),
(3,  1, 'MySQL', 'mysql', 'Relational database design and queries.'),
(4,  1, 'Python', 'python', 'General-purpose programming for data and automation.'),
(5,  1, 'Linux', 'linux', 'Command-line and server administration basics.'),
(6,  1, 'Networking', 'networking', 'Network fundamentals, routing, and troubleshooting.'),
(7,  1, 'Cybersecurity', 'cybersecurity', 'Security fundamentals, risk, and defensive practice.'),
(8,  1, 'Cloud Computing', 'cloud-computing', 'Deploying and running services on cloud platforms.'),
(9,  1, 'Git', 'git', 'Version control and collaborative code workflows.'),
(10, 1, 'API Development', 'api-development', 'Designing and consuming application programming interfaces.'),
(11, 2, 'Business Analysis', 'business-analysis', 'Understanding business needs and documenting requirements.'),
(12, 2, 'Entrepreneurship', 'entrepreneurship', 'Starting and growing a small enterprise.'),
(13, 2, 'Financial Literacy', 'financial-literacy', 'Budgeting, saving, credit, and responsible money management.'),
(14, 2, 'Sales', 'sales', 'Customer conversations, proposals, and closing.'),
(15, 2, 'Accounting', 'accounting', 'Bookkeeping and basic financial statements.'),
(16, 3, 'Graphic Design', 'graphic-design', 'Layout, typography, and visual identity design.'),
(17, 3, 'UI/UX Design', 'ui-ux-design', 'User research, wireframes, and accessible interfaces.'),
(18, 3, 'Video Editing', 'video-editing', 'Editing footage and audio into short-form stories.'),
(19, 3, 'Photography', 'photography', 'Documentary and campaign photography.'),
(20, 3, 'Illustration', 'illustration', 'Hand-drawn and digital illustration.'),
(21, 4, 'Content Writing', 'content-writing', 'Clear writing for websites, reports, and campaigns.'),
(22, 4, 'Translation', 'translation', 'Accurate English–Nepali translation and localisation.'),
(23, 4, 'Public Speaking', 'public-speaking', 'Presenting and facilitating in front of groups.'),
(24, 4, 'Community Mobilization', 'community-mobilization', 'Organising communities around shared goals.'),
(25, 4, 'Facilitation', 'facilitation', 'Running workshops and participatory sessions.'),
(26, 5, 'Digital Marketing', 'digital-marketing', 'Campaign planning across digital channels.'),
(27, 5, 'SEO', 'seo', 'Improving organic search visibility responsibly.'),
(28, 5, 'Social Media Management', 'social-media-management', 'Planning, publishing, and moderating social content.'),
(29, 5, 'Data Visualization', 'data-visualization', 'Turning data into readable charts and dashboards.'),
(30, 5, 'Excel', 'excel', 'Spreadsheet analysis, formulas, and reporting.'),
(31, 5, 'WordPress', 'wordpress', 'Building and maintaining WordPress websites.'),
(32, 5, 'Mobile Development', 'mobile-development', 'Building mobile applications.'),
(33, 6, 'Project Management', 'project-management', 'Planning scope, time, risk, and delivery.'),
(34, 6, 'Human Resources', 'human-resources', 'Recruitment, onboarding, and people support.'),
(35, 6, 'Operations Management', 'operations-management', 'Running day-to-day organisational processes.'),
(36, 6, 'Monitoring and Evaluation', 'monitoring-and-evaluation', 'Measuring outcomes and learning from programmes.'),
(37, 6, 'Leadership', 'leadership', 'Guiding teams and making decisions.'),
(38, 7, 'Research', 'research', 'Designing studies and gathering evidence.'),
(39, 7, 'Data Analysis', 'data-analysis', 'Cleaning, analysing, and interpreting data.'),
(40, 7, 'GIS', 'gis', 'Mapping and spatial analysis.'),
(41, 7, 'Policy Analysis', 'policy-analysis', 'Reading, comparing, and evaluating policies.'),
(42, 7, 'Report Writing', 'report-writing', 'Structuring evidence into clear reports.');

-- =============================================================================
-- SDGs (official names)
-- =============================================================================

INSERT INTO sdgs (id, code, name, description, color_hex) VALUES
(1,  'SDG1',  'No Poverty', 'End poverty in all its forms everywhere.', '#E5243B'),
(2,  'SDG2',  'Zero Hunger', 'End hunger, achieve food security, and promote sustainable agriculture.', '#DDA63A'),
(3,  'SDG3',  'Good Health and Well-being', 'Ensure healthy lives and promote well-being for all ages.', '#4C9F38'),
(4,  'SDG4',  'Quality Education', 'Ensure inclusive and equitable quality education and lifelong learning.', '#C5192D'),
(5,  'SDG5',  'Gender Equality', 'Achieve gender equality and empower all women and girls.', '#FF3A21'),
(6,  'SDG6',  'Clean Water and Sanitation', 'Ensure availability and sustainable management of water and sanitation.', '#26BDE2'),
(7,  'SDG7',  'Affordable and Clean Energy', 'Ensure access to affordable, reliable, sustainable, and modern energy.', '#FCC30B'),
(8,  'SDG8',  'Decent Work and Economic Growth', 'Promote sustained, inclusive, and sustainable economic growth and decent work.', '#A21942'),
(9,  'SDG9',  'Industry, Innovation and Infrastructure', 'Build resilient infrastructure and foster innovation.', '#FD6925'),
(10, 'SDG10', 'Reduced Inequalities', 'Reduce inequality within and among countries.', '#DD1367'),
(11, 'SDG11', 'Sustainable Cities and Communities', 'Make cities inclusive, safe, resilient, and sustainable.', '#FD9D24'),
(12, 'SDG12', 'Responsible Consumption and Production', 'Ensure sustainable consumption and production patterns.', '#BF8B2E'),
(13, 'SDG13', 'Climate Action', 'Take urgent action to combat climate change and its impacts.', '#3F7E44'),
(14, 'SDG14', 'Life Below Water', 'Conserve and sustainably use the oceans, seas, and marine resources.', '#0A97D9'),
(15, 'SDG15', 'Life on Land', 'Protect, restore, and promote sustainable use of terrestrial ecosystems.', '#56C02B'),
(16, 'SDG16', 'Peace, Justice and Strong Institutions', 'Promote peaceful societies and accountable institutions.', '#00689D'),
(17, 'SDG17', 'Partnerships for the Goals', 'Strengthen the means of implementation and global partnerships.', '#19486A');

-- =============================================================================
-- USER SKILLS AND SDG INTERESTS
-- =============================================================================

INSERT INTO user_skills (user_id, skill_id, level) VALUES
(1, 1, 'advanced'), (1, 2, 'intermediate'), (1, 3, 'intermediate'), (1, 9, 'intermediate'),
(2, 16, 'expert'), (2, 17, 'advanced'), (2, 20, 'intermediate'), (2, 28, 'intermediate'),
(5, 30, 'advanced'), (5, 3, 'intermediate'), (5, 39, 'beginner'), (5, 4, 'beginner'),
(6, 21, 'advanced'), (6, 22, 'advanced'), (6, 27, 'intermediate'), (6, 28, 'intermediate'),
(9, 24, 'advanced'), (9, 23, 'intermediate'), (9, 42, 'beginner'),
(10, 32, 'advanced'), (10, 2, 'advanced'), (10, 17, 'intermediate'), (10, 10, 'intermediate'),
(11, 38, 'advanced'), (11, 39, 'advanced'), (11, 40, 'intermediate'), (11, 42, 'advanced'),
(12, 26, 'advanced'), (12, 27, 'advanced'), (12, 21, 'intermediate'), (12, 28, 'advanced');

INSERT INTO user_sdgs (user_id, sdg_id) VALUES
(1, 1), (1, 8), (1, 13),
(2, 4), (2, 5), (2, 8),
(5, 8), (5, 9),
(6, 4), (6, 5), (6, 13),
(9, 1), (9, 3), (9, 5),
(10, 8), (10, 9),
(11, 9), (11, 13), (11, 15),
(12, 5), (12, 8), (12, 10);

-- =============================================================================
-- OPPORTUNITIES
-- =============================================================================

INSERT INTO opportunities
  (id, organization_id, created_by_user_id, sdg_id, title, description,
   responsibilities, requirements, location, type, category, is_remote, deadline, status)
VALUES
(1, 1, 4, 13, 'Programme Intern – Climate Resilience',
 'Support a community climate-resilience programme with research, field notes, and reporting.',
 'Assist with desk research and community interviews; prepare short field notes; contribute to monthly progress reports.',
 'Interest in climate action; strong written communication; ability to travel within Kathmandu Valley; basic spreadsheet skills.',
 'Kathmandu', 'internship', 'Climate & Environment', 0, '2027-01-31', 'open'),

(2, 4, 7, 8, 'Junior PHP Developer',
 'Join a small product team maintaining open-source tools for non-profit organisations. The role is suitable for a recent graduate with a solid PHP foundation.',
 'Build and maintain PHP pages and endpoints; write SQL queries; fix bugs; participate in code review and testing.',
 'PHP 8 basics; MySQL; JavaScript; Git; willingness to learn secure coding practices.',
 'Lalitpur', 'job', 'Digital Careers', 1, '2027-02-15', 'open'),

(3, 2, 8, 4, 'Digital Literacy Volunteer',
 'Help run weekend digital literacy sessions for students and women in Pokhara. Training and session plans are provided.',
 'Facilitate beginner sessions; support learners one-to-one; help with attendance and simple feedback forms.',
 'Comfortable with smartphones and computers; patient communicator; Nepali fluency; available at least two weekends per month.',
 'Pokhara', 'volunteer', 'Education', 0, '2027-01-10', 'open'),

(4, 1, 4, 5, 'Gender Data Fellowship',
 'A six-month fellowship for someone who wants to strengthen gender-disaggregated data practices in community programmes.',
 'Review existing data collection tools; support field data collection; prepare a gender data brief; present findings to partners.',
 'Research or data analysis experience; understanding of gender equality concepts; Excel; report writing.',
 'Remote', 'fellowship', 'Gender Equality', 1, '2027-03-01', 'open'),

(5, 3, 3, 1, 'Financial Literacy Trainer',
 'Deliver practical financial literacy workshops to micro-entrepreneurs in Biratnagar and nearby municipalities.',
 'Prepare session plans; deliver workshops in Nepali; collect feedback; report on participation and learning.',
 'Financial literacy knowledge; facilitation experience; public speaking; willingness to travel locally.',
 'Biratnagar', 'training', 'Livelihood', 0, '2027-02-28', 'open'),

(6, 4, 7, 9, 'UI/UX Design Intern',
 'Work with developers and researchers to improve the usability of a public data platform.',
 'Create wireframes and prototypes; run small usability tests; document design decisions; prepare accessible components.',
 'Portfolio with at least two design projects; familiarity with Figma or similar tools; interest in accessibility.',
 'Kathmandu', 'internship', 'Digital Careers', 1, '2027-01-20', 'open'),

(7, 1, 4, 1, 'Community Outreach Officer',
 'Coordinate outreach for livelihood and climate programmes in peri-urban communities.',
 'Build relationships with local groups; organise meetings; track participation; prepare activity reports.',
 'Community mobilization experience; strong Nepali communication; report writing; two years of relevant experience preferred.',
 'Kathmandu', 'job', 'Livelihood', 0, '2027-04-15', 'open'),

(8, 2, 8, 9, 'Data Visualization Volunteer',
 'Turn programme data into clear charts and simple dashboards for public communication.',
 'Clean datasets; design charts; build a simple dashboard; document the data sources and limitations.',
 'Excel and data visualization skills; attention to detail; ability to explain data to non-specialists.',
 'Remote', 'volunteer', 'Digital Skills', 1, '2027-01-25', 'open'),

(9, 4, 7, 13, 'Research Assistant – Air Quality',
 'Support a short study on urban air quality and community exposure in the Kathmandu Valley.',
 'Collect and clean sensor data; assist with GIS mapping; prepare literature notes; contribute to the final report.',
 'Research methods; data analysis; GIS or willingness to learn; environmental science background preferred.',
 'Lalitpur', 'job', 'Research & Innovation', 0, '2027-03-10', 'open'),

(10, 2, 8, 8, 'Social Media Fellowship',
 'A closed sample opportunity retained to demonstrate expired/closed states in the listing and application rules.',
 'Plan a three-month content calendar; create posts; monitor engagement; report monthly.',
 'Social media experience; content writing; graphic design basics.',
 'Remote', 'fellowship', 'Digital Careers', 1, '2026-09-30', 'closed');

INSERT INTO opportunity_skills (opportunity_id, skill_id) VALUES
(1, 38), (1, 39), (1, 42),
(2, 1), (2, 2), (2, 3), (2, 9),
(3, 21), (3, 25), (3, 28),
(4, 38), (4, 39), (4, 30),
(5, 13), (5, 23), (5, 25),
(6, 16), (6, 17),
(7, 23), (7, 24), (7, 42),
(8, 29), (8, 30), (8, 39),
(9, 38), (9, 39), (9, 40),
(10, 16), (10, 21), (10, 28);

-- =============================================================================
-- APPLICATIONS (one per user per opportunity)
-- =============================================================================

INSERT INTO applications (id, opportunity_id, user_id, cover_letter, status) VALUES
(1, 1, 1, 'I am a computer science student with research and reporting experience, and I want to contribute to community climate work.', 'submitted'),
(2, 2, 1, 'I have built two PHP/MySQL projects and would like to grow in a professional product team.', 'shortlisted'),
(3, 3, 5, 'I can support weekend sessions and help learners with practical digital tasks.', 'reviewing'),
(4, 4, 6, 'My writing and translation work has focused on gender programmes, and I want to strengthen my data skills.', 'submitted'),
(5, 5, 9, 'I have facilitated community health sessions and can adapt financial literacy material for local groups.', 'rejected'),
(6, 9, 11, 'My environmental research and GIS experience match the air quality study, and I can start immediately.', 'hired');

INSERT INTO saved_opportunities (user_id, opportunity_id) VALUES
(1, 3), (1, 5), (5, 2), (6, 1);

-- =============================================================================
-- TALENT PROJECTS
-- =============================================================================

INSERT INTO talent_projects
  (id, organization_id, created_by_user_id, sdg_id, title, description, duration,
   location, is_remote, talent_required, deadline, status)
VALUES
(1, 1, 4, 13, 'Community Climate Storytelling',
 'Collect and publish short stories about local climate adaptation from community members.',
 '3 months', 'Kathmandu', 0, 4, '2027-01-20', 'open'),
(2, 2, 8, 4, 'Digital Skills Bootcamp Mentors',
 'Mentor small groups during a six-week digital skills bootcamp for young women.',
 '6 weeks', 'Pokhara', 0, 6, '2027-02-01', 'open'),
(3, 3, 3, 1, 'Financial Literacy Field Research',
 'Interview micro-entrepreneurs and document how financial literacy training changed their practices.',
 '2 months', 'Biratnagar', 0, 3, '2027-01-15', 'open'),
(4, 4, 7, 9, 'Open Data Dashboard Sprint',
 'Join a four-week sprint to prototype an open data dashboard for a public-interest dataset.',
 '4 weeks', 'Remote', 1, 5, '2027-01-05', 'open');

INSERT INTO talent_project_skills (talent_project_id, skill_id) VALUES
(1, 18), (1, 21), (1, 28),
(2, 23), (2, 25), (2, 26),
(3, 13), (3, 38), (3, 39),
(4, 2), (4, 17), (4, 29);

-- =============================================================================
-- INVITATIONS
-- =============================================================================

INSERT INTO invitations
  (id, sender_user_id, organization_id, talent_user_id, talent_project_id, opportunity_id, message, status)
VALUES
(1, 4, 1, 1, 1, NULL, 'Your research and reporting skills would be valuable for our climate storytelling project. Would you like to join?', 'sent'),
(2, 8, 2, 6, 2, NULL, 'We are looking for a mentor who can help participants write clear content. Your profile looks like a strong fit.', 'accepted'),
(3, 3, 3, 9, 3, NULL, 'Your community facilitation experience would help our field research team. Please consider joining us.', 'sent'),
(4, 7, 4, 10, 4, NULL, 'We would like to invite you to the open data dashboard sprint. Your mobile and JavaScript experience is relevant.', 'declined');

-- =============================================================================
-- FREELANCE PROJECTS
-- =============================================================================

INSERT INTO freelance_projects
  (id, client_user_id, organization_id, title, description, budget_npr, deadline, duration, status)
VALUES
(1, 3, 3, 'Website Redesign for Cooperative',
 'Redesign a small cooperative website with a clear services page, member stories, and an accessible contact form.',
 85000.00, '2027-01-30', '6 weeks', 'open'),
(2, 4, 1, 'Annual Report Layout and Infographics',
 'Design a 24-page annual report with five data infographics, using content supplied by the communications team.',
 45000.00, '2027-01-15', '3 weeks', 'open'),
(3, 7, 4, 'Data Dashboard Prototype',
 'Build a clickable dashboard prototype that displays three public datasets with filters and downloadable summaries.',
 120000.00, '2027-02-20', '8 weeks', 'in_progress'),
(4, 8, 2, 'Nepali Social Media Content Pack',
 'Create a two-week content pack in Nepali for a digital literacy campaign, including captions and simple graphics.',
 30000.00, '2026-12-20', '2 weeks', 'open'),
(5, 3, 3, 'Mobile Savings Tracker',
 'Develop a simple mobile savings tracker for cooperative members, with offline-friendly data entry and a basic summary screen.',
 150000.00, '2027-03-01', '10 weeks', 'in_progress');

INSERT INTO project_skills (freelance_project_id, skill_id) VALUES
(1, 16), (1, 17), (1, 31),
(2, 16), (2, 29),
(3, 2), (3, 10), (3, 29),
(4, 21), (4, 22), (4, 28),
(5, 10), (5, 17), (5, 32);

-- =============================================================================
-- PROPOSALS (one per freelancer per project)
-- =============================================================================

INSERT INTO proposals
  (id, freelance_project_id, freelancer_user_id, bid_amount, delivery_days,
   cover_letter, relevant_skills, portfolio_url, status)
VALUES
(1, 2, 2, 42000.00, 20,
 'I have designed two annual reports for non-profits and can deliver the layout, infographics, and print-ready files within three weeks.',
 'Graphic Design, Data Visualization', 'https://example.com/portfolio/priya', 'submitted'),
(2, 2, 6, 40000.00, 18,
 'I can combine clear report writing with layout support and coordinate closely with your communications team.',
 'Content Writing, Graphic Design', 'https://example.com/portfolio/anisha', 'shortlisted'),
(3, 1, 12, 80000.00, 30,
 'I can redesign the site with a mobile-first layout and train one staff member to update content safely.',
 'WordPress, UI/UX Design, Digital Marketing', 'https://example.com/portfolio/puja', 'submitted'),
(4, 3, 10, 115000.00, 45,
 'I build interactive dashboards with JavaScript and can include accessible filters and a CSV export.',
 'JavaScript, Data Visualization, API Development', 'https://example.com/portfolio/nabin', 'accepted'),
(5, 4, 2, 28000.00, 12,
 'I can produce a consistent two-week content pack with templates that your team can reuse.',
 'Graphic Design, Social Media Management', 'https://example.com/portfolio/priya', 'submitted'),
(6, 5, 6, 145000.00, 60,
 'I can coordinate content and localisation while working with a developer on the mobile build.',
 'Content Writing, Translation, Project Management', 'https://example.com/portfolio/anisha', 'accepted');

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================

INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at) VALUES
(1, 'application_status', 'Application shortlisted', 'Your application for Junior PHP Developer was shortlisted.', '/dashboard/job-seeker', 0, '2026-10-20 09:15:00'),
(1, 'invitation', 'New invitation from Green Himalaya Foundation', 'You were invited to the Community Climate Storytelling project.', '/dashboard/job-seeker', 0, '2026-10-22 11:30:00'),
(2, 'proposal_status', 'Proposal accepted', 'Your proposal for Mobile Savings Tracker was accepted.', '/dashboard/freelancer', 0, '2026-10-23 15:00:00'),
(6, 'invitation', 'Invitation accepted', 'Digital Skills Nepal accepted your invitation response for the bootcamp.', '/dashboard/freelancer', 1, '2026-10-21 10:00:00'),
(1, 'application_received', 'Application submitted', 'Your application for Programme Intern – Climate Resilience was received.', '/dashboard/job-seeker', 1, '2026-10-18 08:45:00'),
(4, 'new_application', 'New application received', 'Aashish Sharma applied for Programme Intern – Climate Resilience.', '/dashboard/employer', 1, '2026-10-18 08:46:00'),
(8, 'new_proposal', 'New proposal received', 'A new proposal was submitted for Nepali Social Media Content Pack.', '/dashboard/employer', 0, '2026-10-24 13:20:00'),
(10, 'proposal_status', 'Proposal accepted', 'Your proposal for Data Dashboard Prototype was accepted.', '/dashboard/freelancer', 0, '2026-10-25 16:10:00');

-- =============================================================================
-- COMMUNITY POSTS AND COMMENTS
-- =============================================================================

INSERT INTO community_posts
  (id, user_id, title, body, type, event_date, event_location, resource_url, status, created_at)
VALUES
(1, 4, 'How can digital skills programmes reach rural municipalities?',
 'We are reviewing our training model and would like to hear what has worked for other organisations. What partnerships, formats, or local support made the biggest difference?',
 'discussion', NULL, NULL, NULL, 'published', '2026-10-05 09:00:00'),
(2, 8, 'TalentBridge Meetup – Pokhara',
 'An informal meetup for students, freelancers, and organisations working on digital skills and careers. Bring one challenge and one thing you can offer.',
 'event', '2027-01-18 14:00:00', 'Pokhara', NULL, 'published', '2026-10-08 10:30:00'),
(3, 2, 'Free design resources for non-profit campaigns',
 'A short collection of starter resources: a colour checklist, an accessible poster template, and a plain-language caption guide.',
 'resource', NULL, NULL, 'https://example.com/resources/design-kit', 'published', '2026-10-11 12:00:00'),
(4, 12, 'Pricing freelance work in NPR: sharing experiences',
 'How do you decide what to charge for a first project with a small organisation? I would like to compare approaches without turning this into a race to the bottom.',
 'discussion', NULL, NULL, NULL, 'published', '2026-10-14 15:15:00'),
(5, 1, 'TalentBridge Virtual Career Fair',
 'An online career fair for students interested in internships, fellowships, and volunteer roles. Organisations will share short project briefs and answer questions.',
 'event', '2027-02-10 11:00:00', 'Online', NULL, 'published', '2026-10-17 08:20:00'),
(6, 6, 'Guide: writing a strong internship application',
 'A short guide covering how to read the requirements, choose a relevant example, and write a cover letter that is specific rather than generic.',
 'resource', NULL, NULL, 'https://example.com/guides/internship-applications', 'published', '2026-10-20 09:40:00'),
(7, 12, 'Unverified promotional post (moderation sample)',
 'This deliberately hidden sample post exists so the administrator moderation screen has content to act on during testing.',
 'discussion', NULL, NULL, NULL, 'hidden', '2026-10-22 17:00:00');

INSERT INTO comments (id, post_id, user_id, body, status, created_at) VALUES
(1, 1, 2, 'Short, local sessions with childcare support made the biggest difference for our participants.', 'visible', '2026-10-06 08:10:00'),
(2, 1, 6, 'We partnered with a local library for internet access, which reduced travel for learners.', 'visible', '2026-10-06 11:35:00'),
(3, 2, 1, 'I would like to attend and can share notes on junior developer portfolios.', 'visible', '2026-10-09 09:05:00'),
(4, 3, 10, 'The caption guide is useful. A Nepali version would help our team.', 'visible', '2026-10-12 14:20:00'),
(5, 4, 4, 'We ask for a small paid discovery step before agreeing to a full project. It protects both sides.', 'visible', '2026-10-15 10:00:00'),
(6, 5, 12, 'Will the sessions be recorded for people who cannot attend live?', 'visible', '2026-10-18 12:45:00'),
(7, 6, 5, 'The section on choosing one relevant example is very practical.', 'visible', '2026-10-21 16:30:00'),
(8, 2, 9, 'Is the venue accessible by public transport in the evening?', 'visible', '2026-10-19 18:10:00'),
(9, 7, 5, 'This hidden comment is used to test moderator visibility controls.', 'hidden', '2026-10-23 10:00:00');

-- =============================================================================
-- End of seed data
-- =============================================================================
