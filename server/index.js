const express = require("express");
const { query } = require("./db");
const { registerInterviewRoutes } = require("./interview-routes");
const { registerResumeRoutes } = require("./resume-routes");

const app = express();
const port = Number(process.env.PORT) || 3001;
const developmentUserEmail = "development@hiretrack.local";

const applicationStatuses = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
];

const applicationColumns = {
  companyName: "company_name",
  jobTitle: "job_title",
  jobUrl: "job_url",
  location: "location",
  status: "status",
  appliedAt: "applied_at",
  notes: "notes",
  resumeId: "resume_id",
};

app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

async function getDevelopmentUser() {
  const result = await query(
    "SELECT id FROM users WHERE email = $1",
    [developmentUserEmail],
  );

  if (result.rows.length === 0) {
    const error = new Error("Development user is missing. Run npm run db:setup.");
    error.statusCode = 500;
    throw error;
  }

  return result.rows[0].id;
}

async function resumeBelongsToUser(queryFunction, resumeId, userId) {
  const result = await queryFunction(
    "SELECT id FROM resumes WHERE id = $1 AND user_id = $2",
    [resumeId, userId],
  );
  return result.rows.length > 0;
}

function mapApplication(row) {
  return {
    id: row.id,
    userId: row.user_id,
    companyName: row.company_name,
    jobTitle: row.job_title,
    jobUrl: row.job_url,
    location: row.location,
    status: row.status,
    resumeId: row.resume_id,
    appliedAt: row.applied_at
      ? row.applied_at instanceof Date
        ? row.applied_at.toISOString().slice(0, 10)
        : String(row.applied_at).slice(0, 10)
      : null,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function cleanOptionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const cleaned = String(value).trim();
  return cleaned || null;
}

function validateDate(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return "Applied date must use YYYY-MM-DD format.";
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return "Applied date must be a valid date.";
  }

  return value;
}

function validateApplicationInput(input, { partial = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Request body must be a JSON object." };
  }

  const allowedFields = Object.keys(applicationColumns);
  const unknownFields = Object.keys(input).filter(
    (field) => !allowedFields.includes(field),
  );

  if (unknownFields.length > 0) {
    return { error: `Unknown field: ${unknownFields[0]}.` };
  }

  const normalized = {};

  if (!partial || Object.prototype.hasOwnProperty.call(input, "companyName")) {
    const companyName = String(input.companyName || "").trim();
    if (!companyName) {
      return { error: "Company name is required." };
    }
    normalized.companyName = companyName;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(input, "jobTitle")) {
    const jobTitle = String(input.jobTitle || "").trim();
    if (!jobTitle) {
      return { error: "Job title is required." };
    }
    normalized.jobTitle = jobTitle;
  }

  for (const field of ["jobUrl", "location", "notes"]) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      normalized[field] = cleanOptionalText(input[field]);
    }
  }

  if (!partial || Object.prototype.hasOwnProperty.call(input, "status")) {
    const status = input.status || "saved";
    if (!applicationStatuses.includes(status)) {
      return {
        error: `Status must be one of: ${applicationStatuses.join(", ")}.`,
      };
    }
    normalized.status = status;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(input, "resumeId")) {
    if (input.resumeId === undefined || input.resumeId === null || input.resumeId === "") {
      normalized.resumeId = null;
    } else {
      const resumeId = Number(input.resumeId);
      if (!Number.isInteger(resumeId) || resumeId < 1) {
        return { error: "Resume must be a valid resume ID." };
      }
      normalized.resumeId = resumeId;
    }
  }

  if (!partial || Object.prototype.hasOwnProperty.call(input, "appliedAt")) {
    const appliedAt = validateDate(input.appliedAt);
    if (typeof appliedAt === "string" && appliedAt.includes("must")) {
      return { error: appliedAt };
    }
    normalized.appliedAt = appliedAt;
  }

  return { value: normalized };
}

app.get("/api/applications", async (_request, response) => {
  const userId = await getDevelopmentUser();
  const result = await query(
    `SELECT id, user_id, company_name, job_title, job_url, location, status,
            resume_id, applied_at, notes, created_at, updated_at
     FROM job_applications
     WHERE user_id = $1
     ORDER BY updated_at DESC, created_at DESC`,
    [userId],
  );

  response.json(result.rows.map(mapApplication));
});

app.get("/api/applications/:id", async (request, response) => {
  const userId = await getDevelopmentUser();
  const applicationId = Number(request.params.id);

  if (!Number.isInteger(applicationId) || applicationId < 1) {
    return response.status(404).json({ error: "Application not found." });
  }

  const result = await query(
    `SELECT id, user_id, company_name, job_title, job_url, location, status,
            resume_id, applied_at, notes, created_at, updated_at
     FROM job_applications
     WHERE id = $1 AND user_id = $2`,
    [applicationId, userId],
  );

  if (result.rows.length === 0) {
    return response.status(404).json({ error: "Application not found." });
  }

  return response.json(mapApplication(result.rows[0]));
});

app.post("/api/applications", async (request, response) => {
  const validation = validateApplicationInput(request.body);
  if (validation.error) {
    return response.status(400).json({ error: validation.error });
  }

  const userId = await getDevelopmentUser();
  const application = validation.value;
  if (
    application.resumeId !== null &&
    !(await resumeBelongsToUser(query, application.resumeId, userId))
  ) {
    return response.status(404).json({ error: "Resume not found." });
  }
  const result = await query(
    `INSERT INTO job_applications
      (user_id, company_name, job_title, job_url, location, status, resume_id, applied_at, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, user_id, company_name, job_title, job_url, location, status,
               resume_id, applied_at, notes, created_at, updated_at`,
    [
      userId,
      application.companyName,
      application.jobTitle,
      application.jobUrl,
      application.location,
      application.status,
      application.resumeId,
      application.appliedAt,
      application.notes,
    ],
  );

  return response.status(201).json(mapApplication(result.rows[0]));
});

app.patch("/api/applications/:id", async (request, response) => {
  const validation = validateApplicationInput(request.body, { partial: true });
  if (validation.error) {
    return response.status(400).json({ error: validation.error });
  }

  const fields = Object.entries(validation.value);
  if (fields.length === 0) {
    return response.status(400).json({ error: "At least one field is required." });
  }

  const userId = await getDevelopmentUser();
  const applicationId = Number(request.params.id);

  if (!Number.isInteger(applicationId) || applicationId < 1) {
    return response.status(404).json({ error: "Application not found." });
  }

  if (
    Object.prototype.hasOwnProperty.call(validation.value, "resumeId") &&
    validation.value.resumeId !== null &&
    !(await resumeBelongsToUser(query, validation.value.resumeId, userId))
  ) {
    return response.status(404).json({ error: "Resume not found." });
  }

  const setClauses = fields.map(
    ([field], index) => `${applicationColumns[field]} = $${index + 1}`,
  );
  const values = fields.map(([, value]) => value);
  values.push(applicationId, userId);

  const result = await query(
    `UPDATE job_applications
     SET ${setClauses.join(", ")}, updated_at = NOW()
     WHERE id = $${values.length - 1} AND user_id = $${values.length}
     RETURNING id, user_id, company_name, job_title, job_url, location, status,
               resume_id, applied_at, notes, created_at, updated_at`,
    values,
  );

  if (result.rows.length === 0) {
    return response.status(404).json({ error: "Application not found." });
  }

  return response.json(mapApplication(result.rows[0]));
});

app.delete("/api/applications/:id", async (request, response) => {
  const userId = await getDevelopmentUser();
  const applicationId = Number(request.params.id);

  if (!Number.isInteger(applicationId) || applicationId < 1) {
    return response.status(404).json({ error: "Application not found." });
  }

  const result = await query(
    "DELETE FROM job_applications WHERE id = $1 AND user_id = $2",
    [applicationId, userId],
  );

  if (result.rowCount === 0) {
    return response.status(404).json({ error: "Application not found." });
  }

  return response.status(204).end();
});

registerInterviewRoutes(app, { query, getDevelopmentUser });
registerResumeRoutes(app, { query, getDevelopmentUser });

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(error.statusCode || error.status || 500).json({
    error:
      error.statusCode || error.status
        ? error.message
        : "Unexpected server error.",
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`HireTrack API listening on port ${port}`);
});