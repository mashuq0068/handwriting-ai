// Creates the target database if it does not already exist.
// Connects to the default `postgres` maintenance DB to issue CREATE DATABASE.
import pg from "pg";
import { config } from "./config.js";

const { Client } = pg;

async function main() {
  const dbName = config.pg.database;
  const admin = new Client({
    host: config.pg.host,
    port: config.pg.port,
    user: config.pg.user,
    password: config.pg.password,
    database: "postgres",
  });

  await admin.connect();
  const { rows } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (rows.length) {
    console.log(`[createdb] Database "${dbName}" already exists.`);
  } else {
    // CREATE DATABASE cannot be parameterized; dbName comes from our own config.
    await admin.query(`CREATE DATABASE "${dbName}"`);
    console.log(`[createdb] Created database "${dbName}".`);
  }
  await admin.end();
}

main().catch((err) => {
  console.error("[createdb] Failed:", err.message);
  process.exit(1);
});
