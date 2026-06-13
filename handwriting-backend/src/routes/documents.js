import { Router } from "express";
import { query } from "../db.js";
import { asyncHandler, requireAuth } from "../middleware.js";

export const documentsRouter = Router();

// All document routes require a logged-in user.
documentsRouter.use(requireAuth);

function shape(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    language: row.language,
    fontName: row.font_name,
    settings: row.settings,
    pageCount: row.page_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /documents — list the current user's documents (most recent first).
// Pagination is handled server-side: ?page=1&limit=10&q=search
// Returns { documents, total, page, limit, totalPages }.
documentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = (req.query.q || "").toString().trim();

    // Clamp pagination params to safe bounds.
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const offset = (page - 1) * limit;

    // WHERE clause shared by the count and the page query.
    const where = search ? "user_id = $1 AND title ILIKE $2" : "user_id = $1";
    const whereParams = search ? [req.user.id, `%${search}%`] : [req.user.id];

    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM documents WHERE ${where}`,
      whereParams
    );
    const total = countResult.rows[0].total;

    const { rows } = await query(
      `SELECT * FROM documents
       WHERE ${where}
       ORDER BY updated_at DESC
       LIMIT $${whereParams.length + 1} OFFSET $${whereParams.length + 2}`,
      [...whereParams, limit, offset]
    );

    res.json({
      documents: rows.map(shape),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  })
);

// GET /documents/:id — fetch one document the user owns.
documentsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT * FROM documents WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Document not found" });
    res.json({ document: shape(rows[0]) });
  })
);

// POST /documents — create a new document.
documentsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      title = "Untitled document",
      content = "",
      language = "latin",
      fontName = "",
      settings = {},
      pageCount = 1,
    } = req.body || {};

    const { rows } = await query(
      `INSERT INTO documents (user_id, title, content, language, font_name, settings, page_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        req.user.id,
        String(title).slice(0, 300) || "Untitled document",
        String(content),
        String(language),
        String(fontName),
        settings && typeof settings === "object" ? settings : {},
        Number.isFinite(+pageCount) ? Math.max(1, Math.trunc(+pageCount)) : 1,
      ]
    );
    res.status(201).json({ document: shape(rows[0]) });
  })
);

// PUT /documents/:id — update an existing document (partial fields allowed).
documentsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await query(
      `SELECT * FROM documents WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!existing.rows.length) return res.status(404).json({ error: "Document not found" });
    const cur = existing.rows[0];

    const b = req.body || {};
    const title = b.title !== undefined ? String(b.title).slice(0, 300) : cur.title;
    const content = b.content !== undefined ? String(b.content) : cur.content;
    const language = b.language !== undefined ? String(b.language) : cur.language;
    const fontName = b.fontName !== undefined ? String(b.fontName) : cur.font_name;
    const settings =
      b.settings !== undefined && typeof b.settings === "object" ? b.settings : cur.settings;
    const pageCount =
      b.pageCount !== undefined && Number.isFinite(+b.pageCount)
        ? Math.max(1, Math.trunc(+b.pageCount))
        : cur.page_count;

    const { rows } = await query(
      `UPDATE documents
       SET title = $1, content = $2, language = $3, font_name = $4, settings = $5, page_count = $6
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [title, content, language, fontName, settings, pageCount, req.params.id, req.user.id]
    );
    res.json({ document: shape(rows[0]) });
  })
);

// DELETE /documents/:id
documentsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { rowCount } = await query(
      `DELETE FROM documents WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Document not found" });
    res.json({ ok: true });
  })
);
