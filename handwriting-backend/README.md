# Handwriting Backend (Quillify)

Express + **raw Postgres SQL** API for authentication and document/project persistence.
No ORM — every query is hand-written SQL via `pg`.

## Stack
- Express 4
- `pg` (raw SQL, connection pool)
- `bcryptjs` (password hashing)
- `jsonwebtoken` (short-lived access tokens)
- Opaque, DB-stored, rotating **refresh tokens** (sha256-hashed at rest)

## Setup

1. Install deps:
   ```sh
   npm install
   ```
2. Configure `.env` (copy from `.env.example`). Set your Postgres password.
3. Create the database and apply the schema:
   ```sh
   npm run db:create   # CREATE DATABASE hand_db (if missing)
   npm run migrate     # apply src/schema.sql
   ```
4. Start the server:
   ```sh
   npm run dev         # http://localhost:4000
   ```

## Data model
- `users` — id, name, email (unique, case-insensitive), password_hash
- `refresh_tokens` — rotating refresh tokens (hash, expiry, revocation)
- `documents` — a saved handwriting project: markdown `content` + editor `settings` (jsonb)

## API

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET  | `/health` | – | DB health check |
| POST | `/auth/register` | – | Create account → `{ user, accessToken, refreshToken }` |
| POST | `/auth/login` | – | Sign in |
| POST | `/auth/refresh` | refresh token | Rotate + new access token |
| POST | `/auth/logout` | refresh token | Revoke refresh token |
| GET  | `/auth/me` | access | Current user |
| GET  | `/documents` | access | List user's documents (`?q=` search) |
| POST | `/documents` | access | Create document |
| GET  | `/documents/:id` | access | Fetch one |
| PUT  | `/documents/:id` | access | Update |
| DELETE | `/documents/:id` | access | Delete |

The access token is sent as `Authorization: Bearer <token>`. The refresh token is
set as an httpOnly cookie **and** returned in the body (SPA fallback for cross-origin).
