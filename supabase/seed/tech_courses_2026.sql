-- =============================================================================
-- One-time data script: technology course catalog (Nov 2026)
-- Run once in the Supabase SQL Editor AFTER migration 016.
-- Safe to run again: courses are matched by slug.
--
-- What it does:
--   1. Adds technology subjects (keeps any subject that is still used).
--   2. Adds/updates the 14 technology courses as published.
--   3. ARCHIVES every other course (hidden from the catalog). Nothing is
--      deleted, so past orders, payments and enrollments stay intact.
--   4. Deletes old non-technology subjects that no course uses any more.
-- =============================================================================
begin;

-- 1. Subjects --------------------------------------------------------------
insert into public.subjects (name, code, color, description) values
  ('AI & Data',         'AID', '#F7931A', 'Artificial intelligence, machine learning and data'),
  ('Web Development',   'WEB', '#4672B8', 'Frontend, backend and full stack development'),
  ('Programming',       'PRG', '#22C55E', 'Programming languages and software quality'),
  ('Cloud & DevOps',    'CLD', '#06B6D4', 'Cloud platforms, DevOps and automation'),
  ('Cyber Security',    'SEC', '#EF4444', 'Security, ethical hacking and defence'),
  ('Networking',        'NET', '#A855F7', 'Hardware, networking and CCNA'),
  ('Design',            'DSN', '#EC4899', 'UI/UX and product design'),
  ('Digital Marketing', 'MKT', '#EAB308', 'SEO, social media and online marketing'),
  ('Business Software', 'BIZ', '#64748B', 'Accounting and business software')
on conflict (name) do update set code = excluded.code, color = excluded.color, description = excluded.description;

-- 2. Courses ---------------------------------------------------------------
with new_courses (slug, title, category, description, price, mrp_min, mrp_max, months, cover) as (
  values
    ('ai-machine-learning',            'AI & Machine Learning',               'AI & Data',         'Learn Python for AI, core machine learning algorithms, neural networks and deep learning, and build real AI projects end to end.', 14999, 35000, 50000, 6, 0),
    ('data-science-analytics',         'Data Science & Analytics',            'AI & Data',         'Statistics, Python, pandas, data visualisation and machine learning to turn raw data into business decisions.',                     15999, 40000, 60000, 6, 1),
    ('full-stack-web-development',     'Full Stack Web Development',          'Web Development',   'HTML, CSS, JavaScript, React, Node.js and databases. Build and deploy complete web applications.',                                  12999, 30000, 45000, 6, 2),
    ('cloud-computing-aws-azure',      'Cloud Computing (AWS / Azure)',       'Cloud & DevOps',    'Core cloud concepts and hands-on AWS and Azure services: compute, storage, networking, security and deployment.',                   11999, 25000, 40000, 4, 3),
    ('cyber-security-ethical-hacking', 'Cyber Security & Ethical Hacking',    'Cyber Security',    'Networking basics, Linux, web and network security, ethical hacking tools and techniques, and how to defend systems.',              14999, 30000, 50000, 6, 4),
    ('devops-automation',              'DevOps & Automation',                 'Cloud & DevOps',    'Linux, Git, CI/CD pipelines, Docker, Kubernetes and infrastructure as code for automated software delivery.',                       15999, 35000, 55000, 5, 5),
    ('digital-marketing-seo',          'Digital Marketing & SEO Mastery',     'Digital Marketing', 'SEO, Google Ads, social media marketing, content and analytics to grow a brand online.',                                             6999, 15000, 25000, 3, 0),
    ('ui-ux-design-figma-xd',          'UI/UX Design (Figma & Adobe XD)',     'Design',            'User research, wireframing, prototyping and visual design with Figma and Adobe XD, with a portfolio project.',                       8999, 20000, 35000, 4, 1),
    ('prompt-engineering-generative-ai','Prompt Engineering & Generative AI', 'AI & Data',         'How large language models work, effective prompting, and using generative AI tools for work and projects.',                           5999, 15000, 25000, 2, 2),
    ('data-analytics-power-bi-sql',    'Data Analytics (Power BI + SQL)',     'AI & Data',         'SQL for querying data and Power BI for dashboards and reports, with real business datasets.',                                        8999, 18000, 30000, 3, 3),
    ('python-programming-masterclass', 'Python Programming Masterclass',      'Programming',       'Python from basics to advanced: data types, functions, OOP, files, libraries and mini projects.',                                    5999, 12000, 20000, 3, 4),
    ('software-testing-qa',            'Software Testing & QA',               'Programming',       'Manual testing, test cases, bug tracking, and automation testing with Selenium.',                                                     7999, 15000, 25000, 3, 5),
    ('hardware-networking-ccna',       'Hardware & Networking (CCNA)',        'Networking',        'Computer hardware, troubleshooting, networking fundamentals, routing and switching aligned with CCNA.',                               6999, 15000, 25000, 3, 0),
    ('advanced-tally-prime-gst',       'Advanced Tally Prime & GST Filing',   'Business Software', 'Accounting in Tally Prime, inventory, payroll, GST setup, returns and filing.',                                                       4999,  8000, 15000, 3, 1)
)
insert into public.courses
  (slug, title, category, description, price, market_price_min, market_price_max, duration_months,
   duration_hours, level, status, published_at, cover_index, subject_id)
select nc.slug, nc.title, nc.category, nc.description, nc.price, nc.mrp_min, nc.mrp_max, nc.months,
       0, 'Beginner', 'published', now(), nc.cover,
       (select s.id from public.subjects s where s.name = nc.category)
from new_courses nc
on conflict (slug) do update set
  title            = excluded.title,
  category         = excluded.category,
  description      = excluded.description,
  price            = excluded.price,
  market_price_min = excluded.market_price_min,
  market_price_max = excluded.market_price_max,
  duration_months  = excluded.duration_months,
  status           = 'published',
  published_at     = coalesce(public.courses.published_at, now()),
  subject_id       = excluded.subject_id;

-- 3. Archive every other course -------------------------------------------
update public.courses
set status = 'archived'
where slug not in (
  'ai-machine-learning', 'data-science-analytics', 'full-stack-web-development',
  'cloud-computing-aws-azure', 'cyber-security-ethical-hacking', 'devops-automation',
  'digital-marketing-seo', 'ui-ux-design-figma-xd', 'prompt-engineering-generative-ai',
  'data-analytics-power-bi-sql', 'python-programming-masterclass', 'software-testing-qa',
  'hardware-networking-ccna', 'advanced-tally-prime-gst'
)
and status <> 'archived';

-- 4. Remove old subjects that nothing uses any more ------------------------
delete from public.subjects s
where s.name not in ('AI & Data', 'Web Development', 'Programming', 'Cloud & DevOps', 'Cyber Security',
                     'Networking', 'Design', 'Digital Marketing', 'Business Software')
  and not exists (select 1 from public.courses c where c.subject_id = s.id and c.status <> 'archived');

commit;

-- Check the result:
select title, category, price, market_price_min, market_price_max, duration_months, status
from public.courses order by status, title;
