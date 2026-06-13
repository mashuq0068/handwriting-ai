import { verifyAccessToken } from "./tokens.js";

// Gate routes behind a valid access token. Attaches req.user = { id, email, name }.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Missing access token" });
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, name: payload.name };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired access token" });
  }
}

// Wrap async route handlers so thrown errors hit the error middleware.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
