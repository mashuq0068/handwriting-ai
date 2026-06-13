// Applies schema.sql to the configured database.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pool } from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = await readFile(join(__dirname, "schema.sql"), "utf8");
  await pool.query(sql);
  console.log("[migrate] Schema applied successfully.");
  await pool.end();
}

main().catch((err) => {
  console.error("[migrate] Failed:", err.message);
  process.exit(1);
});
