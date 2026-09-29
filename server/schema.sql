CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE TABLE IF NOT EXISTS job_applications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  job_url TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'saved' CHECK (
    status IN ('saved', 'applied', 'interviewing', 'offer', 'accepted', 'rejected', 'withdrawn')
  ),
  applied_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interviews (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  round_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')
  ),
  type TEXT NOT NULL DEFAULT 'other' CHECK (
    type IN ('phone', 'video', 'onsite', 'take_home', 'other')
  ),
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  location TEXT,
  meeting_url TEXT,
  interviewer_name TEXT,
  interviewer_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS job_applications_user_updated_idx
  ON job_applications (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS interviews_application_idx
  ON interviews (application_id);

CREATE TABLE IF NOT EXISTS resumes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS resume_id INTEGER REFERENCES resumes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS resumes_user_updated_idx
  ON resumes (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS job_applications_resume_idx
  ON job_applications (resume_id);

CREATE TABLE IF NOT EXISTS saved_jobs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  external_id TEXT,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  location TEXT,
  salary_min NUMERIC,
  salary_max NUMERIC,
  job_url TEXT NOT NULL,
  description TEXT,
  skills TEXT,
  match_percentage INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT saved_jobs_user_url_unique UNIQUE (user_id, job_url)
);

CREATE INDEX IF NOT EXISTS saved_jobs_user_created_idx
  ON saved_jobs (user_id, created_at DESC);