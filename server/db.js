const { Pool } = require("pg");
const fs = require("node:fs");
const path = require("node:path");

let pool = null;
let dbInitError = null;

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 10000,
      ssl: process.env.DATABASE_URL.includes("sslmode=")
        ? undefined
        : { rejectUnauthorized: false },
    });

    pool.on("error", (err) => {
      console.error("[HireTrack PostgreSQL Pool Error]:", err.message);
    });

    // Run schema migrations and test connection on startup
    const schemaPath = path.join(__dirname, "schema.sql");
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, "utf8");
      pool.query(schemaSql).then(() => {
        console.log("[HireTrack DB] PostgreSQL schema verified and up-to-date.");
      }).catch((schemaErr) => {
        console.error("[HireTrack DB Schema Migration Warning]:", schemaErr.message);
      });
    }

    pool.query("SELECT NOW() as connected_at, current_database() as db_name", (err, res) => {
      if (err) {
        dbInitError = err;
        console.error("[HireTrack DB ERROR] Failed to connect to PostgreSQL:", err.message);
        console.error("[HireTrack DB ERROR] Verify DATABASE_URL credentials and network reachability.");
      } else {
        dbInitError = null;
        console.log(
          `[HireTrack DB] Connected successfully to persistent PostgreSQL database '${res.rows[0].db_name}' at:`,
          res.rows[0].connected_at,
        );
      }
    });
  } catch (err) {
    dbInitError = err;
    console.error("[HireTrack DB ERROR] Failed to initialize PostgreSQL pool with DATABASE_URL:", err.message);
  }
} else {
  console.error(
    "[HireTrack DB CONFIG ERROR] DATABASE_URL environment variable is not configured. Real PostgreSQL connection is required.",
  );
}

async function query(text, params) {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not configured. HireTrack requires a persistent PostgreSQL database connection.",
    );
  }

  if (!pool) {
    throw new Error(
      `PostgreSQL database connection pool is not initialized: ${dbInitError?.message || "Check DATABASE_URL configuration"}`,
    );
  }

  // Execute directly against PostgreSQL database
  return pool.query(text, params);
}

async function closeDatabase() {
  if (pool) {
    await pool.end().catch(() => {});
  }
}

function getDatabaseStatus() {
  const isConnected = Boolean(pool && !dbInitError);
  return {
    isRealPostgres: isConnected,
    configured: Boolean(process.env.DATABASE_URL),
    persistenceType: isConnected ? "postgresql" : "unconfigured",
    error: dbInitError ? dbInitError.message : (!process.env.DATABASE_URL ? "DATABASE_URL is not configured" : null),
  };
}

module.exports = {
  query,
  closeDatabase,
  getDatabaseStatus,
};
