import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

// A single shared connection pool for the whole app.
export const pool = config.databaseUrl
  ? new Pool({ connectionString: config.databaseUrl })
  : new Pool({
      host: config.pg.host,
      port: config.pg.port,
      user: config.pg.user,
      password: config.pg.password,
      database: config.pg.database,
    });

pool.on("error", (err) => {
  console.error("[db] Unexpected idle client error:", err.message);
});

// Thin helper so route code reads cleanly: `const { rows } = await query(sql, params)`.
export function query(text, params) {
  return pool.query(text, params);
}

// Run a set of statements inside a single transaction.
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
