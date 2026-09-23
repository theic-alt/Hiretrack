const fs = require("node:fs/promises");
const path = require("node:path");
const { query, closeDatabase } = require("./db");

async function setupDatabase() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = await fs.readFile(schemaPath, "utf8");

  await query(schema);
  await query(
    `INSERT INTO users (name, email)
     VALUES ($1, $2)
     ON CONFLICT (email) DO NOTHING`,
    ["Development User", "development@hiretrack.local"],
  );

  console.log("HireTrack database is ready.");
}

setupDatabase()
  .catch((error) => {
    console.error("Database setup failed:", error.message);
    process.exitCode = 1;
  })
  .finally(closeDatabase);