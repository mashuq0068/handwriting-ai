import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config.js";
import { pool } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { documentsRouter } from "./routes/documents.js";
import { fontsRouter } from "./routes/fonts.js";

const app = express();

app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "12mb" })); // fonts + photo uploads are larger than docs
app.use(cookieParser());

// Health check.
app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: "up" });
  } catch {
    res.status(500).json({ ok: false, db: "down" });
  }
});

app.use("/auth", authRouter);
app.use("/documents", documentsRouter);
app.use("/fonts", fontsRouter);

// 404
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// Central error handler.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[error]", err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

app.listen(config.port, () => {
  console.log(`[server] Quillify backend listening on http://localhost:${config.port}`);
  console.log(`[server] CORS origins: ${config.corsOrigins.join(", ")}`);
});
