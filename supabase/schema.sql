-- ====================================================================
-- SMART CAMPUS AI - POSTGRESQL DATABASE SCHEMA & ROW LEVEL SECURITY
-- ====================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Define Custom Enums
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('student', 'faculty', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status_enum AS ENUM ('present', 'absent', 'late');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE submission_status_enum AS ENUM ('submitted', 'graded', 'late');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE announcement_category_enum AS ENUM ('general', 'academic', 'exam', 'urgent', 'placement', 'event');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE study_material_category_enum AS ENUM ('notes', 'pyq', 'syllabus', 'slides', 'lab_manual');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE opportunity_type_enum AS ENUM ('internship', 'hackathon', 'workshop', 'research');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'student',
    department TEXT NOT NULL DEFAULT 'Computer Science & Engineering',
    semester INTEGER DEFAULT 4,
    roll_no TEXT,
    designation TEXT,
    cabin_location TEXT,
    office_hours TEXT,
    phone TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Roles Table (Protected RBAC)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    role user_role_enum NOT NULL DEFAULT 'student',
    assigned_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Departments Table
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    hod_name TEXT,
    building TEXT,
    contact_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    semester INTEGER NOT NULL,
    credits INTEGER NOT NULL DEFAULT 4,
    faculty_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Timetable Table
CREATE TABLE IF NOT EXISTS public.timetable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room TEXT NOT NULL,
    department TEXT NOT NULL,
    semester INTEGER NOT NULL,
    faculty_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Attendance Table
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status attendance_status_enum NOT NULL DEFAULT 'present',
    marked_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, course_id, date)
);

-- 9. Assignments Table
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES public.profiles(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    max_marks INTEGER NOT NULL DEFAULT 100,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Submissions Table
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    submission_text TEXT,
    file_url TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    marks_obtained NUMERIC(5,2),
    feedback TEXT,
    graded_by UUID REFERENCES public.profiles(id),
    status submission_status_enum NOT NULL DEFAULT 'submitted',
    UNIQUE(assignment_id, student_id)
);

-- 11. Study Materials Table
CREATE TABLE IF NOT EXISTS public.study_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category study_material_category_enum NOT NULL DEFAULT 'notes',
    file_url TEXT NOT NULL,
    file_type TEXT DEFAULT 'pdf',
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
    semester INTEGER NOT NULL DEFAULT 4,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category announcement_category_enum NOT NULL DEFAULT 'general',
    author_id UUID NOT NULL REFERENCES public.profiles(id),
    target_role user_role_enum,
    target_department TEXT,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Events Table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    event_date TIMESTAMPTZ NOT NULL,
    venue TEXT NOT NULL,
    organizer_club TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'tech',
    registration_link TEXT,
    banner_url TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Event Registrations Table
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- 15. Discussions Table
CREATE TABLE IF NOT EXISTS public.discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'academics',
    tags TEXT[] DEFAULT '{}',
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Discussion Replies Table
CREATE TABLE IF NOT EXISTS public.discussion_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    is_verified_answer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Opportunities Table
CREATE TABLE IF NOT EXISTS public.opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    organization TEXT NOT NULL,
    type opportunity_type_enum NOT NULL DEFAULT 'internship',
    description TEXT NOT NULL,
    stipend_or_prize TEXT,
    deadline TIMESTAMPTZ,
    eligibility TEXT,
    apply_url TEXT,
    posted_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Quest Points & Gamification
CREATE TABLE IF NOT EXISTS public.quest_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    xp_points INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    read BOOLEAN NOT NULL DEFAULT FALSE,
    link_screen TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper functions for role checks
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role_enum AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_faculty_or_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by authenticated users"
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile bio and avatar"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
    id = auth.uid() 
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
);

-- User Roles Policies (Strict admin control)
CREATE POLICY "Users can view user roles"
ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can insert or update user roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Attendance Policies
CREATE POLICY "Students can view only their own attendance"
ON public.attendance FOR SELECT TO authenticated
USING (
    student_id = auth.uid() 
    OR public.is_faculty_or_admin()
);

CREATE POLICY "Faculty and admin can record attendance"
ON public.attendance FOR ALL TO authenticated
USING (public.is_faculty_or_admin())
WITH CHECK (public.is_faculty_or_admin());

-- Assignments Policies
CREATE POLICY "Anyone can view assignments"
ON public.assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Faculty and admin can manage assignments"
ON public.assignments FOR ALL TO authenticated
USING (public.is_faculty_or_admin())
WITH CHECK (public.is_faculty_or_admin());

-- Submissions Policies
CREATE POLICY "Students can view only their own submissions"
ON public.submissions FOR SELECT TO authenticated
USING (
    student_id = auth.uid() 
    OR public.is_faculty_or_admin()
);

CREATE POLICY "Students can create/update their own submissions"
ON public.submissions FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Faculty can update grades on submissions"
ON public.submissions FOR UPDATE TO authenticated
USING (public.is_faculty_or_admin())
WITH CHECK (public.is_faculty_or_admin());

-- Announcements Policies
CREATE POLICY "Announcements viewable by target audience"
ON public.announcements FOR SELECT TO authenticated
USING (
    target_role IS NULL 
    OR target_role = public.current_user_role() 
    OR public.is_admin()
);

CREATE POLICY "Faculty and admins can post announcements"
ON public.announcements FOR INSERT TO authenticated
WITH CHECK (public.is_faculty_or_admin());

CREATE POLICY "Admins can update or delete announcements"
ON public.announcements FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Study Materials Policies
CREATE POLICY "Study materials viewable by all authenticated users"
ON public.study_materials FOR SELECT TO authenticated USING (true);

CREATE POLICY "Faculty and admin can upload study materials"
ON public.study_materials FOR ALL TO authenticated
USING (public.is_faculty_or_admin())
WITH CHECK (public.is_faculty_or_admin());

-- Discussions Policies
CREATE POLICY "Discussions viewable by all authenticated users"
ON public.discussions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create discussions"
ON public.discussions FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid());

-- Notifications Policies
CREATE POLICY "Users can only view their own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Triggers for Auth Signup Auto-Profile Creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'student'
    );
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
