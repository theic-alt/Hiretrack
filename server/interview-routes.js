const interviewStatuses = ["scheduled", "completed", "cancelled", "rescheduled"];
const interviewTypes = ["phone", "video", "onsite", "take_home", "other"];

const interviewColumns = {
  roundName: "round_name",
  status: "status",
  type: "type",
  scheduledAt: "scheduled_at",
  durationMinutes: "duration_minutes",
  location: "location",
  meetingUrl: "meeting_url",
  interviewerName: "interviewer_name",
  interviewerEmail: "interviewer_email",
  notes: "notes",
};

const interviewSelect = `
  SELECT i.id, i.application_id, i.round_name, i.status, i.type, i.scheduled_at,
         i.duration_minutes, i.location, i.meeting_url, i.interviewer_name,
         i.interviewer_email, i.notes, i.created_at, i.updated_at
`;

function parsePositiveId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function cleanOptionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const cleaned = String(value).trim();
  return cleaned || null;
}

function validateScheduledAt(value) {
  if (value === undefined || value === null || value === "") {
    return { value: null };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { error: "Interview date and time must be valid." };
  }

  return { value: date.toISOString() };
}

function validateDuration(value) {
  if (value === undefined || value === null || value === "") {
    return { value: null };
  }

  const duration = Number(value);
  if (!Number.isInteger(duration) || duration < 0 || duration > 1440) {
    return { error: "Duration must be a whole number between 0 and 1440 minutes." };
  }

  return { value: duration };
}

function validateInterviewInput(input, { partial = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Request body must be a JSON object." };
  }

  const allowedFields = Object.keys(interviewColumns);
  const unknownFields = Object.keys(input).filter(
    (field) => !allowedFields.includes(field),
  );

  if (unknownFields.length > 0) {
    return { error: `Unknown field: ${unknownFields[0]}.` };
  }

  const normalized = {};

  if (!partial || Object.prototype.hasOwnProperty.call(input, "roundName")) {
    const roundName = String(input.roundName || "").trim();
    if (!roundName) {
      return { error: "Round name is required." };
    }
    normalized.roundName = roundName;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(input, "status")) {
    const status = input.status || "scheduled";
    if (!interviewStatuses.includes(status)) {
      return {
        error: `Interview status must be one of: ${interviewStatuses.join(", ")}.`,
      };
    }
    normalized.status = status;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(input, "type")) {
    const type = input.type || "other";
    if (!interviewTypes.includes(type)) {
      return {
        error: `Interview type must be one of: ${interviewTypes.join(", ")}.`,
      };
    }
    normalized.type = type;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(input, "scheduledAt")) {
    const scheduledAt = validateScheduledAt(input.scheduledAt);
    if (scheduledAt.error) {
      return { error: scheduledAt.error };
    }
    normalized.scheduledAt = scheduledAt.value;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(input, "durationMinutes")) {
    const duration = validateDuration(input.durationMinutes);
    if (duration.error) {
      return { error: duration.error };
    }
    normalized.durationMinutes = duration.value;
  }

  for (const field of [
    "location",
    "meetingUrl",
    "interviewerName",
    "interviewerEmail",
    "notes",
  ]) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      normalized[field] = cleanOptionalText(input[field]);
    }
  }

  if (
    normalized.meetingUrl &&
    !/^https?:\/\/\S+$/i.test(normalized.meetingUrl)
  ) {
    return { error: "Meeting URL must start with http:// or https://." };
  }

  if (
    normalized.interviewerEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.interviewerEmail)
  ) {
    return { error: "Interviewer email must be a valid email address." };
  }

  return { value: normalized };
}

function mapInterview(row) {
  return {
    id: row.id,
    applicationId: row.application_id,
    roundName: row.round_name,
    status: row.status,
    type: row.type,
    scheduledAt: row.scheduled_at
      ? new Date(row.scheduled_at).toISOString()
      : null,
    durationMinutes: row.duration_minutes,
    location: row.location,
    meetingUrl: row.meeting_url,
    interviewerName: row.interviewer_name,
    interviewerEmail: row.interviewer_email,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function applicationBelongsToUser(query, applicationId, userId) {
  const result = await query(
    "SELECT id FROM job_applications WHERE id = $1 AND user_id = $2",
    [applicationId, userId],
  );
  return result.rows.length > 0;
}

async function getInterviewForUser(query, interviewId, userId) {
  const result = await query(
    `${interviewSelect}
     FROM interviews i
     INNER JOIN job_applications a ON a.id = i.application_id
     WHERE i.id = $1 AND a.user_id = $2`,
    [interviewId, userId],
  );
  return result.rows[0] || null;
}

async function touchApplication(query, applicationId) {
  await query(
    "UPDATE job_applications SET updated_at = NOW() WHERE id = $1",
    [applicationId],
  );
}

function registerInterviewRoutes(app, { query, requireAuth }) {
  app.get(
    "/api/applications/:applicationId/interviews",
    requireAuth,
    async (request, response) => {
      const applicationId = parsePositiveId(request.params.applicationId);
      const userId = request.userId;

      if (!applicationId || !(await applicationBelongsToUser(query, applicationId, userId))) {
        return response.status(404).json({ error: "Application not found." });
      }

      const result = await query(
        `${interviewSelect}
         FROM interviews i
         WHERE i.application_id = $1
         ORDER BY i.scheduled_at ASC NULLS LAST, i.updated_at DESC`,
        [applicationId],
      );

      return response.json(result.rows.map(mapInterview));
    },
  );

  app.get("/api/interviews/:id", requireAuth, async (request, response) => {
    const interviewId = parsePositiveId(request.params.id);
    const userId = request.userId;

    if (!interviewId) {
      return response.status(404).json({ error: "Interview not found." });
    }

    const interview = await getInterviewForUser(query, interviewId, userId);
    if (!interview) {
      return response.status(404).json({ error: "Interview not found." });
    }

    return response.json(mapInterview(interview));
  });

  app.post(
    "/api/applications/:applicationId/interviews",
    requireAuth,
    async (request, response) => {
      const applicationId = parsePositiveId(request.params.applicationId);
      const validation = validateInterviewInput(request.body);

      if (validation.error) {
        return response.status(400).json({ error: validation.error });
      }

      const userId = request.userId;
      if (!applicationId || !(await applicationBelongsToUser(query, applicationId, userId))) {
        return response.status(404).json({ error: "Application not found." });
      }

      const interview = validation.value;
      const result = await query(
        `INSERT INTO interviews
          (application_id, round_name, status, type, scheduled_at, duration_minutes,
           location, meeting_url, interviewer_name, interviewer_email, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, application_id, round_name, status, type, scheduled_at,
                   duration_minutes, location, meeting_url, interviewer_name,
                   interviewer_email, notes, created_at, updated_at`,
        [
          applicationId,
          interview.roundName,
          interview.status,
          interview.type,
          interview.scheduledAt,
          interview.durationMinutes,
          interview.location,
          interview.meetingUrl,
          interview.interviewerName,
          interview.interviewerEmail,
          interview.notes,
        ],
      );

      await touchApplication(query, applicationId);
      return response.status(201).json(mapInterview(result.rows[0]));
    },
  );

  app.patch("/api/interviews/:id", requireAuth, async (request, response) => {
    const interviewId = parsePositiveId(request.params.id);
    const validation = validateInterviewInput(request.body, { partial: true });

    if (validation.error) {
      return response.status(400).json({ error: validation.error });
    }

    const fields = Object.entries(validation.value);
    if (fields.length === 0) {
      return response.status(400).json({ error: "At least one field is required." });
    }

    const userId = request.userId;
    if (!interviewId) {
      return response.status(404).json({ error: "Interview not found." });
    }

    const existingInterview = await getInterviewForUser(query, interviewId, userId);
    if (!existingInterview) {
      return response.status(404).json({ error: "Interview not found." });
    }

    const setClauses = fields.map(
      ([field], index) => `${interviewColumns[field]} = $${index + 1}`,
    );
    const values = fields.map(([, value]) => value);
    values.push(interviewId);

    const result = await query(
      `UPDATE interviews
       SET ${setClauses.join(", ")}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING id, application_id, round_name, status, type, scheduled_at,
                 duration_minutes, location, meeting_url, interviewer_name,
                 interviewer_email, notes, created_at, updated_at`,
      values,
    );

    await touchApplication(query, existingInterview.application_id);
    return response.json(mapInterview(result.rows[0]));
  });

  app.delete("/api/interviews/:id", requireAuth, async (request, response) => {
    const interviewId = parsePositiveId(request.params.id);
    const userId = request.userId;

    if (!interviewId) {
      return response.status(404).json({ error: "Interview not found." });
    }

    const existingInterview = await getInterviewForUser(query, interviewId, userId);
    if (!existingInterview) {
      return response.status(404).json({ error: "Interview not found." });
    }

    await query("DELETE FROM interviews WHERE id = $1", [interviewId]);
    await touchApplication(query, existingInterview.application_id);
    return response.status(204).end();
  });
}

module.exports = {
  registerInterviewRoutes,
};