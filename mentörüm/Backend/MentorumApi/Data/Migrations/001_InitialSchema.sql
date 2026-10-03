-- 001_InitialSchema.sql
-- Mentorum MVP - Veritabanı Şeması (PostgreSQL)

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    google_id TEXT,
    role TEXT CHECK(role IN ('Coach','Student','Parent')),
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coaches (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    plan_type TEXT DEFAULT 'free'
);

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES users(id),
    grade INTEGER,
    track TEXT CHECK(track IN ('SAY','EA','SOZ','ORTAOKUL', null)),
    target_university TEXT,
    target_department TEXT,
    target_score REAL,
    coaching_start_date DATE,
    is_active INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coach_notes (
    id UUID PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parents (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_parents (
    id UUID PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
    parent_email TEXT NOT NULL,
    relation TEXT CHECK(relation IN ('Anne','Baba','Veli','Diğer')),
    phone TEXT,
    invite_token UUID,
    invite_expiry TIMESTAMP WITH TIME ZONE,
    is_accepted INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exam_results (
    id UUID PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    exam_date DATE,
    exam_type TEXT CHECK(exam_type IN ('TYT','AYT','LGS','Okul','Deneme','Diğer')),
    exam_name TEXT,
    total_net REAL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exam_scores (
    exam_id UUID REFERENCES exam_results(id) ON DELETE CASCADE,
    subject_code TEXT,
    score REAL,
    max_score REAL,
    PRIMARY KEY (exam_id, subject_code)
);

CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    short_code TEXT,
    default_color TEXT,
    is_system_subject INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS student_subjects (
    id UUID PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    resource_book TEXT,
    color TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS curriculum_years (
    id UUID PRIMARY KEY,
    year_label TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS curriculum_topics (
    id UUID PRIMARY KEY,
    curriculum_year_id UUID REFERENCES curriculum_years(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    grade INTEGER,
    curriculum_type TEXT CHECK(curriculum_type IN ('NEW','OLD')),
    unit_number INTEGER,
    unit_name TEXT,
    topic_number TEXT,
    topic_name TEXT,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS homework_templates (
    id UUID PRIMARY KEY,
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    resource_ref TEXT,
    curriculum_topic_id UUID REFERENCES curriculum_topics(id) ON DELETE SET NULL,
    free_topic TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS homework_assignments (
    id UUID PRIMARY KEY,
    template_id UUID REFERENCES homework_templates(id) ON DELETE SET NULL,
    snapshot_title TEXT NOT NULL,
    snapshot_desc TEXT,
    snapshot_source TEXT,
    template_version INTEGER DEFAULT 1,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    student_subject_id UUID REFERENCES student_subjects(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    status TEXT CHECK(status IN ('PENDING','DONE','OVERDUE','LATE_DONE','CANCELLED')),
    completion_percentage SMALLINT CHECK(completion_percentage BETWEEN 0 AND 100),
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by TEXT CHECK(completed_by IN ('Student','Coach')),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancel_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT CHECK(type IN ('HOMEWORK_ASSIGNED','HOMEWORK_DUE','HOMEWORK_OVERDUE','HOMEWORK_DONE')),
    title TEXT,
    body TEXT,
    payload TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS invite_tokens (
    id UUID PRIMARY KEY,
    token UUID UNIQUE NOT NULL,
    email TEXT NOT NULL,
    role TEXT CHECK(role IN ('Student','Parent')),
    related_id UUID,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_revoked INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE
);
