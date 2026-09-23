const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to start the HireTrack server.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function query(text, params) {
  return pool.query(text, params);
}

async function closeDatabase() {
  await pool.end();
}

module.exports = {
  query,
  closeDatabase,
};