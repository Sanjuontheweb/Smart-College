-- ====================================================================
-- SMART CAMPUS AI - SEED DATA (ACADEMICS, DEPARTMENTS, SYLLABUS, USERS)
-- ====================================================================

-- 1. Departments
INSERT INTO public.departments (code, name, hod_name, building, contact_email)
VALUES 
('CSE', 'Computer Science & Engineering', 'Dr. Aruna Shankaran', 'Alan Turing Block - 3rd Floor', 'hod.cse@smartcampus.edu'),
('ECE', 'Electronics & Communication Engineering', 'Dr. Ramesh Naidu', 'Vikram Sarabhai Block - 2nd Floor', 'hod.ece@smartcampus.edu'),
('MECH', 'Mechanical Engineering', 'Dr. C. P. Joshi', 'Visvesvaraya Mechanical Block', 'hod.mech@smartcampus.edu')
ON CONFLICT (code) DO NOTHING;

-- 2. Mock Faculty & Admin Users
-- (Note: In production these sync with auth.users via auth signup; here pre-seeded for demo/local testing)
INSERT INTO public.profiles (id, email, full_name, role, department, designation, cabin_location, office_hours, phone, bio)
VALUES 
('a0000000-0000-0000-0000-000000000001', 'priya.raman@smartcampus.edu', 'Dr. Priya Raman', 'faculty', 'Computer Science & Engineering', 'Associate Professor', 'Turing Block, Room 304', 'Mon, Wed, Fri 2:00 PM - 4:00 PM', '+91 98765 43210', 'Specializes in Design & Analysis of Algorithms, Graph Theory, and Competitive Programming.'),
('a0000000-0000-0000-0000-000000000002', 'k.venkatesh@smartcampus.edu', 'Prof. K. Venkatesh', 'faculty', 'Computer Science & Engineering', 'Assistant Professor', 'Turing Block, Room 312', 'Tue, Thu 10:00 AM - 12:30 PM', '+91 98765 43211', 'Database systems architect, distributed query optimization, and Supabase / Postgres expert.'),
('a0000000-0000-0000-0000-000000000003', 'dean.verma@smartcampus.edu', 'Dr. Rajesh Verma', 'admin', 'Academic Affairs', 'Dean of Academic Affairs', 'Administrative Central Block, Suite 101', 'Mon-Fri 11:00 AM - 1:00 PM', '+91 98765 43200', 'Oversees university curriculum, campus accreditations, admissions, and institutional governance.'),
('a0000000-0000-0000-0000-000000000004', 'aarav.sharma@smartcampus.edu', 'Aarav Sharma', 'student', 'Computer Science & Engineering', 'Student (4th Sem)', 'Hostel Block B, Room 204', 'N/A', '+91 98765 99001', 'B.Tech CSE 4th Semester student. AI club lead, avid hackathon participant.')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- 3. Courses (Derived from real semester curriculum: ADA, DBMS, DSA, Discrete Maths, etc.)
INSERT INTO public.courses (id, code, title, department, semester, credits, faculty_id)
VALUES 
('c0000000-0000-0000-0000-000000000001', 'BCS401', 'Analysis and Design of Algorithms', 'Computer Science & Engineering', 4, 4, 'a0000000-0000-0000-0000-000000000001'),
('c0000000-0000-0000-0000-000000000002', 'BCS403', 'Database Management Systems', 'Computer Science & Engineering', 4, 4, 'a0000000-0000-0000-0000-000000000002'),
('c0000000-0000-0000-0000-000000000003', 'BCS405A', 'Discrete Mathematical Structures', 'Computer Science & Engineering', 4, 3, 'a0000000-0000-0000-0000-000000000001'),
('c0000000-0000-0000-0000-000000000004', 'BUHK408', 'Universal Human Values', 'Computer Science & Engineering', 4, 2, 'a0000000-0000-0000-0000-000000000003'),
('c0000000-0000-0000-0000-000000000005', 'BBOK407', 'Biology For Engineers', 'Computer Science & Engineering', 4, 3, 'a0000000-0000-0000-0000-000000000003')
ON CONFLICT (code) DO NOTHING;

-- 4. Timetable (Weekly Schedule)
INSERT INTO public.timetable (course_id, day_of_week, start_time, end_time, room, department, semester, faculty_id)
VALUES 
('c0000000-0000-0000-0000-000000000001', 'Monday', '09:00:00', '10:00:00', 'LH-301 (Turing Hall)', 'Computer Science & Engineering', 4, 'a0000000-0000-0000-0000-000000000001'),
('c0000000-0000-0000-0000-000000000002', 'Monday', '10:00:00', '11:00:00', 'LH-302 (Database Lab)', 'Computer Science & Engineering', 4, 'a0000000-0000-0000-0000-000000000002'),
('c0000000-0000-0000-0000-000000000003', 'Monday', '11:15:00', '12:15:00', 'LH-301 (Turing Hall)', 'Computer Science & Engineering', 4, 'a0000000-0000-0000-0000-000000000001'),
('c0000000-0000-0000-0000-000000000001', 'Tuesday', '09:00:00', '10:00:00', 'LH-301 (Turing Hall)', 'Computer Science & Engineering', 4, 'a0000000-0000-0000-0000-000000000001'),
('c0000000-0000-0000-0000-000000000002', 'Tuesday', '10:00:00', '11:00:00', 'LH-302 (Database Lab)', 'Computer Science & Engineering', 4, 'a0000000-0000-0000-0000-000000000002'),
('c0000000-0000-0000-0000-000000000005', 'Wednesday', '09:00:00', '10:00:00', 'LH-201', 'Computer Science & Engineering', 4, 'a0000000-0000-0000-0000-000000000003'),
('c0000000-0000-0000-0000-000000000004', 'Wednesday', '10:00:00', '11:00:00', 'Auditorium West', 'Computer Science & Engineering', 4, 'a0000000-0000-0000-0000-000000000003');

-- 5. Sample Attendance
INSERT INTO public.attendance (student_id, course_id, date, status, notes)
VALUES 
('a0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '1 day', 'present', 'Active class participation'),
('a0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', CURRENT_DATE - INTERVAL '1 day', 'present', 'SQL lab exercise completed'),
('a0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '2 days', 'present', 'Graph isomorphism lecture'),
('a0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000005', CURRENT_DATE - INTERVAL '3 days', 'late', 'Arrived 10 min late with permission')
ON CONFLICT DO NOTHING;

-- 6. Assignments
INSERT INTO public.assignments (id, course_id, faculty_id, title, description, due_date, max_marks)
VALUES 
('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Assignment 1: Dynamic Programming & Greedy Algorithms', 'Implement 0/1 Knapsack using dynamic programming in C++/Python and compare empirical runtime against Greedy Fractional Knapsack on input arrays up to 10,000 items.', NOW() + INTERVAL '4 days', 25),
('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Assignment 2: B+ Trees & Relational Algebra Optimization', 'Write relational algebra expressions and draw optimized query execution trees for university enrollment queries with join push-downs.', NOW() + INTERVAL '7 days', 20)
ON CONFLICT (id) DO NOTHING;

-- 7. Announcements
INSERT INTO public.announcements (title, content, category, author_id, is_pinned)
VALUES 
('Mid-Semester Examination Schedule Announced', 'The tentative timetable for 4th Semester Mid-Term Examinations starting from 18th November 2026 has been published on the portal. Hall tickets will be issued next week.', 'exam', 'a0000000-0000-0000-0000-000000000003', true),
('Smart Campus Hackathon 2026 Registrations Open', 'Calling all developers! 36-Hour Hackathon with cash prizes up to INR 1,50,000. Tracks include AI in Healthcare, Smart Campus Mobility, and Cyber Defense.', 'event', 'a0000000-0000-0000-0000-000000000001', true),
('Campus Library Extended Hours During Exams', 'The Central Library will remain open until 11:30 PM starting Monday for exam preparations. RFID cards are mandatory for entry.', 'general', 'a0000000-0000-0000-0000-000000000003', false);

-- 8. Opportunities (Internships & Hackathons)
INSERT INTO public.opportunities (title, organization, type, description, stipend_or_prize, deadline, eligibility)
VALUES 
('AI & Computer Vision Intern', 'Google Research India', 'internship', '3-month summer internship working with the multimodal AI research team on edge neural models.', 'INR 85,000 / month', NOW() + INTERVAL '25 days', 'Pre-final & Final year CSE/ECE students with Python/PyTorch proficiency.'),
('Smart India Hackathon (SIH 2026)', 'Ministry of Education', 'hackathon', 'National level hackathon solving real-world government agency problem statements.', 'Prizes up to INR 1,00,000 per problem', NOW() + INTERVAL '14 days', 'Teams of 6 students with at least 1 female team member.'),
('Full-Stack React Native Engineer Intern', 'Zerodha Tech', 'internship', 'Build high-performance mobile screens and telemetry dashboards using React Native & TypeScript.', 'INR 60,000 / month', NOW() + INTERVAL '18 days', 'Students with demonstrable React Native / Expo projects.');

-- 9. Gamification Badges
INSERT INTO public.badges (name, description, icon, required_xp, badge_tier)
VALUES 
('Campus Pioneer', 'Joined the Smart Campus platform and completed profile setup', 'compass-outline', 50, 'bronze'),
('Consistent Scholar', 'Maintained 85%+ attendance across all enrolled subjects for 3 consecutive weeks', 'trophy-outline', 200, 'silver'),
('Code Ninja', 'Submitted 5 assignments ahead of the deadline with grade > 90%', 'code-slash-outline', 500, 'gold'),
('Discussion Champion', 'Helped peers with 10 verified answers on the Campus Forum', 'chatbubbles-outline', 1000, 'diamond')
ON CONFLICT (name) DO NOTHING;
