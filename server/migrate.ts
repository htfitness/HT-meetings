/**
 * Idempotent schema setup: creates enums and tables if they do not exist.
 * Runs automatically at server startup so a fresh Render deployment works
 * without manual migration steps.
 */
import { getPool } from "./db";

const DDL = `
DO $$ BEGIN CREATE TYPE role AS ENUM ('user', 'admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE meeting_status AS ENUM ('scheduled', 'in_progress', 'completed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE section_status AS ENUM ('pending', 'discussed', 'deferred', 'skipped'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE action_status AS ENUM ('open', 'done', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE topic_status AS ENUM ('open', 'added', 'declined'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE member_role AS ENUM ('member', 'group_admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  username varchar(64) NOT NULL UNIQUE,
  name varchar(255) NOT NULL,
  password_hash varchar(255) NOT NULL,
  role role NOT NULL DEFAULT 'user',
  active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  last_signed_in timestamp
);

CREATE TABLE IF NOT EXISTS groups (
  id serial PRIMARY KEY,
  name varchar(255) NOT NULL,
  description text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  id serial PRIMARY KEY,
  group_id integer NOT NULL,
  user_id integer NOT NULL,
  role member_role NOT NULL DEFAULT 'member',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS template_sections (
  id serial PRIMARY KEY,
  group_id integer NOT NULL,
  title varchar(255) NOT NULL,
  purpose text,
  default_minutes integer NOT NULL DEFAULT 10,
  sort_order integer NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS template_items (
  id serial PRIMARY KEY,
  section_id integer NOT NULL,
  content text NOT NULL,
  sort_order integer NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meetings (
  id serial PRIMARY KEY,
  group_id integer NOT NULL,
  title varchar(255) NOT NULL,
  meeting_date varchar(10) NOT NULL,
  status meeting_status NOT NULL DEFAULT 'scheduled',
  current_section_id integer,
  started_at timestamp,
  completed_at timestamp,
  created_by_id integer NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meeting_sections (
  id serial PRIMARY KEY,
  meeting_id integer NOT NULL,
  title varchar(255) NOT NULL,
  purpose text,
  planned_minutes integer NOT NULL DEFAULT 10,
  sort_order integer NOT NULL,
  status section_status NOT NULL DEFAULT 'pending',
  timer_started_at timestamp,
  elapsed_seconds integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meeting_items (
  id serial PRIMARY KEY,
  section_id integer NOT NULL,
  content text NOT NULL,
  sort_order integer NOT NULL,
  carried_over boolean NOT NULL DEFAULT false,
  created_by_id integer,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notes (
  id serial PRIMARY KEY,
  meeting_id integer NOT NULL,
  section_id integer,
  content text NOT NULL,
  author_id integer NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS action_items (
  id serial PRIMARY KEY,
  group_id integer NOT NULL,
  meeting_id integer,
  section_id integer,
  title varchar(500) NOT NULL,
  owner_id integer,
  due_date varchar(10),
  status action_status NOT NULL DEFAULT 'open',
  created_by_id integer NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS decisions (
  id serial PRIMARY KEY,
  meeting_id integer NOT NULL,
  section_id integer,
  content text NOT NULL,
  author_id integer NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS next_meeting_topics (
  id serial PRIMARY KEY,
  group_id integer NOT NULL,
  content text NOT NULL,
  author_id integer NOT NULL,
  status topic_status NOT NULL DEFAULT 'open',
  meeting_id integer,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transcripts (
  id serial PRIMARY KEY,
  meeting_id integer NOT NULL,
  file_name varchar(255) NOT NULL,
  content text NOT NULL,
  uploaded_by_id integer NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meetings_group ON meetings (group_id, meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_sections_meeting ON meeting_sections (meeting_id);
CREATE INDEX IF NOT EXISTS idx_notes_meeting ON notes (meeting_id);
CREATE INDEX IF NOT EXISTS idx_actions_group ON action_items (group_id, status);
CREATE INDEX IF NOT EXISTS idx_actions_owner ON action_items (owner_id, status);
CREATE INDEX IF NOT EXISTS idx_topics_group ON next_meeting_topics (group_id, status);
CREATE INDEX IF NOT EXISTS idx_members_user ON group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_members_group ON group_members (group_id);
`;

export async function runMigrations() {
  const pool = getPool();
  await pool.query(DDL);
  console.log("[db] Schema is up to date");
}

// Allow running directly: tsx server/migrate.ts
const invokedDirectly =
  typeof process.argv[1] === "string" &&
  /server[\\/]migrate\.(ts|js|mjs)$/.test(process.argv[1]);
if (invokedDirectly) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
