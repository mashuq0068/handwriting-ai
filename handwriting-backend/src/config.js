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

  // Optional: vision APIs for single-photo handwriting labeling.
  // Anthropic is primary; Gemini (free tier) is the fallback on any Anthropic error.
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || null,
    model: process.env.ANTHROPIC_MODEL || "claude-opus-4-8",
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || null,
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  },
  // Generic OpenAI-compatible vision provider — plug in Groq / OpenRouter /
  // GitHub Models / Together / etc. by setting base URL + key + model.
  openaiCompat: {
    baseUrl: process.env.OPENAI_COMPAT_BASE_URL || null,
    apiKey: process.env.OPENAI_COMPAT_API_KEY || null,
    model: process.env.OPENAI_COMPAT_MODEL || null,
  },
};
