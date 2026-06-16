import dotenv from "dotenv";
dotenv.config();

const required = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[config] Warning: ${key} is not set — using an insecure fallback.`);
  }
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:8080")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  // Postgres: prefer DATABASE_URL, else individual params.
  databaseUrl: process.env.DATABASE_URL || null,
  pg: {
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "postgres",
    database: process.env.PGDATABASE || "hand_db",
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "insecure_dev_access_secret",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "insecure_dev_refresh_secret",
    accessTtl: process.env.ACCESS_TOKEN_TTL || "15m",
    refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 30,
  },

  // Two AI providers only:
  //  • Claude (Anthropic) — VISION: reads an uploaded sample and locates letters.
  //    Cannot generate images.
  //  • GPT (OpenAI) — VISION (gpt-4o) + IMAGE GENERATION (gpt-image-1): can draw a
  //    clean cloned alphabet specimen from the sample.
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || null,
    model: process.env.ANTHROPIC_MODEL || "claude-opus-4-8",
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || null,
    visionModel: process.env.OPENAI_VISION_MODEL || "gpt-4o",
    imageModel: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
  },
};
