import { Router } from "express";
import { query } from "../db.js";
import { config } from "../config.js";
import { asyncHandler, requireAuth } from "../middleware.js";
import { labelHandwriting } from "../vision.js";

export const fontsRouter = Router();

// GET /fonts/ai-status — whether the single-photo AI extractor is configured.
fontsRouter.get("/ai-status", requireAuth, (_req, res) => {
  const enabled = Boolean(
    config.anthropic.apiKey ||
      config.gemini.apiKey ||
      (config.openaiCompat.apiKey && config.openaiCompat.baseUrl && config.openaiCompat.model)
  );
  res.json({ enabled });
});

// Metadata shape (never includes the binary `data`).
function shape(row) {
  return {
    id: row.id,
    name: row.name,
    family: row.family,
    language: row.language,
    format: row.format,
    glyphCount: row.glyph_count,
    source: row.source,
    metrics: row.metrics,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// POST /fonts/label — single-photo mode: one-time vision call that locates and
// labels isolated letters in an uploaded handwriting image. Returns boxes only;
// vectorization + font assembly stay client-side and free.
// Body: { image: "data:image/...;base64,...." }  (or raw base64)
fontsRouter.post(
  "/label",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { image, language = "latin", details = "" } = req.body || {};
    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "An image (base64 data URL) is required" });
    }
    try {
      const glyphs = await labelHandwriting(image, { language: String(language), details: String(details) });
      res.json({ glyphs });
    } catch (err) {
      // Surface a clean message; the client falls back to manual/template mode.
      res.status(err.status || 502).json({ error: err.message || "Labeling failed" });
    }
  })
);

// Everything below requires auth and operates on the current user's fonts.
fontsRouter.use(requireAuth);

// GET /fonts — list the user's fonts (metadata only).
fontsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT id, user_id, name, family, language, format, glyph_count, source, metrics, created_at, updated_at
       FROM fonts WHERE user_id = $1 ORDER BY updated_at DESC`,
      [req.user.id]
    );
    res.json({ fonts: rows.map(shape) });
  })
);

// POST /fonts — create a font. Expects the TTF as base64 in `dataBase64`.
fontsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      name = "My handwriting",
      family,
      language = "latin",
      format = "ttf",
      glyphCount = 0,
      source = "template",
      metrics = {},
      dataBase64,
    } = req.body || {};

    if (!family) return res.status(400).json({ error: "family is required" });
    if (!dataBase64) return res.status(400).json({ error: "dataBase64 (font bytes) is required" });

    // Strip an optional data-URL prefix, then decode.
    const b64 = String(dataBase64).replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(b64, "base64");
    if (!buffer.length) return res.status(400).json({ error: "Empty font data" });

    const { rows } = await query(
      `INSERT INTO fonts (user_id, name, family, language, format, glyph_count, source, data, metrics)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, user_id, name, family, language, format, glyph_count, source, metrics, created_at, updated_at`,
      [
        req.user.id,
        String(name).slice(0, 120) || "My handwriting",
        String(family).slice(0, 120),
        String(language),
        String(format),
        Number.isFinite(+glyphCount) ? Math.max(0, Math.trunc(+glyphCount)) : 0,
        source === "photo" ? "photo" : "template",
        buffer,
        metrics && typeof metrics === "object" ? metrics : {},
      ]
    );
    res.status(201).json({ font: shape(rows[0]) });
  })
);

// GET /fonts/:id/file — stream the TTF bytes (this is what FontFace fetches).
fontsRouter.get(
  "/:id/file",
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT data, format FROM fonts WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Font not found" });
    const { data, format } = rows[0];
    res.setHeader("Content-Type", format === "woff" ? "font/woff" : "font/ttf");
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.send(data); // `data` is a Node Buffer from BYTEA
  })
);

// DELETE /fonts/:id
fontsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { rowCount } = await query(
      `DELETE FROM fonts WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Font not found" });
    res.json({ ok: true });
  })
);
