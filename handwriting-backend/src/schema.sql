-- ============================================================================
-- Quillify schema (raw SQL). Idempotent — safe to run repeatedly.
-- Run against the `hand_db` database.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- Auto-update updated_at on row modification.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Store emails case-insensitively unique.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));

-- ---------------------------------------------------------------------------
-- refresh_tokens  (one row per issued refresh token; supports rotation)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,                 -- sha256 of the raw refresh token
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_hash_idx ON refresh_tokens (token_hash);

-- ---------------------------------------------------------------------------
-- documents  (a saved handwriting project: markdown + all editor settings)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'Untitled document',
  content     TEXT NOT NULL DEFAULT '',       -- markdown body
  language    TEXT NOT NULL DEFAULT 'latin',
  font_name   TEXT NOT NULL DEFAULT '',
  settings    JSONB NOT NULL DEFAULT '{}'::jsonb, -- ink, paper, page size, slant, etc.
  page_count  INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_documents_updated_at ON documents;
CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS documents_user_idx ON documents (user_id, updated_at DESC);
