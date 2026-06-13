import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { query } from "./db.js";

// --- Access token (short-lived JWT, sent in Authorization header) ----------
export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessTtl }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

// --- Refresh token (opaque random string; only its hash is stored) ---------
function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// Issue a new refresh token, persist its hash, return the raw token.
export async function issueRefreshToken(userId, userAgent = null) {
  const raw = crypto.randomBytes(48).toString("hex");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + config.jwt.refreshTtlDays * 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent)
     VALUES ($1, $2, $3, $4)`,
    [userId, tokenHash, expiresAt, userAgent]
  );
  return { raw, expiresAt };
}

// Look up a refresh token row by its raw value (validates hash, expiry, revocation).
export async function findValidRefreshToken(raw) {
  if (!raw) return null;
  const tokenHash = hashToken(raw);
  const { rows } = await query(
    `SELECT * FROM refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
     LIMIT 1`,
    [tokenHash]
  );
  return rows[0] || null;
}

export async function revokeRefreshTokenByRaw(raw) {
  if (!raw) return;
  const tokenHash = hashToken(raw);
  await query(`UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1`, [tokenHash]);
}

export async function revokeRefreshTokenById(id) {
  await query(`UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1`, [id]);
}
