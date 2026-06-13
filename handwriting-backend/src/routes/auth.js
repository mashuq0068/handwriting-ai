import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import { config } from "../config.js";
import { asyncHandler, requireAuth } from "../middleware.js";
import {
  signAccessToken,
  issueRefreshToken,
  findValidRefreshToken,
  revokeRefreshTokenByRaw,
  revokeRefreshTokenById,
} from "../tokens.js";

export const authRouter = Router();

const REFRESH_COOKIE = "refresh_token";

function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // set true behind HTTPS in production
    path: "/",
    maxAge: config.jwt.refreshTtlDays * 24 * 60 * 60 * 1000,
  };
}

function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email, createdAt: row.created_at };
}

// Issue both tokens, set the refresh cookie, and shape the auth response.
async function issueSession(res, user, userAgent) {
  const accessToken = signAccessToken(user);
  const { raw: refreshToken } = await issueRefreshToken(user.id, userAgent);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  return {
    user: publicUser(user),
    accessToken,
    refreshToken, // also returned so SPA can store it (cross-origin fallback)
  };
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /auth/register
authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { name = "", email, password } = req.body || {};
    if (!isValidEmail(email)) return res.status(400).json({ error: "A valid email is required" });
    if (!password || String(password).length < 8)
      return res.status(400).json({ error: "Password must be at least 8 characters" });

    const exists = await query("SELECT 1 FROM users WHERE lower(email) = lower($1)", [email]);
    if (exists.rows.length) return res.status(409).json({ error: "An account with this email already exists" });

    const passwordHash = await bcrypt.hash(String(password), 12);
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3) RETURNING *`,
      [String(name).trim(), String(email).trim(), passwordHash]
    );
    const session = await issueSession(res, rows[0], req.headers["user-agent"] || null);
    res.status(201).json(session);
  })
);

// POST /auth/login
authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    const { rows } = await query("SELECT * FROM users WHERE lower(email) = lower($1)", [email]);
    const user = rows[0];
    // Always run a compare to avoid leaking which emails exist (timing).
    const hash = user ? user.password_hash : "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinv";
    const ok = await bcrypt.compare(String(password), hash);
    if (!user || !ok) return res.status(401).json({ error: "Invalid email or password" });

    const session = await issueSession(res, user, req.headers["user-agent"] || null);
    res.json(session);
  })
);

// POST /auth/refresh — rotate refresh token, issue new access token.
authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
    const tokenRow = await findValidRefreshToken(raw);
    if (!tokenRow) return res.status(401).json({ error: "Invalid or expired refresh token" });

    const { rows } = await query("SELECT * FROM users WHERE id = $1", [tokenRow.user_id]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "User no longer exists" });

    // Rotation: revoke the used token, issue a fresh pair.
    await revokeRefreshTokenById(tokenRow.id);
    const session = await issueSession(res, user, req.headers["user-agent"] || null);
    res.json(session);
  })
);

// POST /auth/logout — revoke the current refresh token.
authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
    await revokeRefreshTokenByRaw(raw);
    res.clearCookie(REFRESH_COOKIE, { path: "/" });
    res.json({ ok: true });
  })
);

// GET /auth/me — current user from access token.
authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await query("SELECT * FROM users WHERE id = $1", [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json({ user: publicUser(rows[0]) });
  })
);
