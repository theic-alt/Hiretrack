const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const uploadDirectory = path.join(__dirname, "..", "uploads", "resumes");

const resumeSelect = `
  SELECT id, user_id, name, original_filename, file_path, mime_type, file_size,
         is_default, created_at, updated_at
`;

function parsePositiveId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function cleanResumeName(value) {
  const name = String(value || "").trim();
  if (!name) {
    return { error: "Resume name is required." };
  }
  if (name.length > 120) {
    return { error: "Resume name must be 120 characters or fewer." };
  }
  return { value: name };
}

function cleanOriginalFilename(value) {
  const filename = path
    .basename(String(value || "resume.pdf"))
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
  return filename || "resume.pdf";
}

function getBoundary(contentType) {
  const match = String(contentType || "").match(
    /boundary=(?:"([^"]+)"|([^;]+))/i,
  );
  return match ? match[1] || match[2].trim() : null;
}

function parseMultipartBody(body, contentType) {
  if (!Buffer.isBuffer(body)) {
    return { error: "Resume upload must use multipart/form-data." };
  }

  const boundary = getBoundary(contentType);
  if (!boundary) {
    return { error: "Resume upload is missing its multipart boundary." };
  }

  const delimiter = Buffer.from(`--${boundary}`);
  const headerDelimiter = Buffer.from("\r\n\r\n");
  const parts = [];
  let cursor = body.indexOf(delimiter);

  if (cursor < 0) {
    return { error: "Resume upload is not a valid multipart request." };
  }

  while (cursor >= 0) {
    const partStart = cursor + delimiter.length;
    if (body.subarray(partStart, partStart + 2).equals(Buffer.from("--"))) {
      break;
    }

    const contentStart = body.subarray(partStart, partStart + 2).equals(
      Buffer.from("\r\n"),
    )
      ? partStart + 2
      : partStart;
    const nextDelimiter = body.indexOf(delimiter, contentStart);
    if (nextDelimiter < 0) {
      return { error: "Resume upload is not a valid multipart request." };
    }

    const part = body.subarray(contentStart, nextDelimiter - 2);
    const headerEnd = part.indexOf(headerDelimiter);
    if (headerEnd < 0) {
      return { error: "Resume upload is not a valid multipart request." };
    }

    const headers = part.subarray(0, headerEnd).toString("utf8");
    const content = part.subarray(headerEnd + headerDelimiter.length);
    const disposition = headers.match(
      /content-disposition:\s*form-data;\s*([^]*?)(?:\r\n|$)/i,
    );
    const name = disposition?.[1]?.match(/name="([^"]*)"/i)?.[1];
    const filename = disposition?.[1]?.match(/filename="([^"]*)"/i)?.[1];
    const contentTypeHeader = headers.match(
      /content-type:\s*([^\r\n]+)/i,
    )?.[1]?.trim();

    if (!name) {
      return { error: "Resume upload contains an invalid form field." };
    }

    parts.push({ name, filename, contentType: contentTypeHeader, content });
    cursor = nextDelimiter;
  }

  const filePart = parts.find((part) => part.filename !== undefined);
  if (!filePart) {
    return { error: "A PDF resume file is required." };
  }

  const namePart = parts.find((part) => part.name === "name" && !part.filename);
  return {
    name: namePart ? namePart.content.toString("utf8").trim() : "",
    file: {
      originalFilename: cleanOriginalFilename(filePart.filename),
      mimeType: filePart.contentType || "",
      buffer: filePart.content,
    },
  };
}

function mapResume(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getResumeFilePath(filePath) {
  if (!filePath || path.basename(filePath) !== filePath) {
    const error = new Error("Stored resume file path is invalid.");
    error.statusCode = 500;
    throw error;
  }
  return path.join(uploadDirectory, filePath);
}

async function getResumeForUser(query, resumeId, userId) {
  const result = await query(
    `${resumeSelect}
     FROM resumes
     WHERE id = $1 AND user_id = $2`,
    [resumeId, userId],
  );
  return result.rows[0] || null;
}

function registerResumeRoutes(app, { query, requireAuth }) {
  app.get("/api/resumes", requireAuth, async (request, response) => {
    const userId = request.userId;
    const result = await query(
      `${resumeSelect}
       FROM resumes
       WHERE user_id = $1
       ORDER BY is_default DESC, updated_at DESC, created_at DESC`,
      [userId],
    );
    return response.json(result.rows.map(mapResume));
  });

  app.post(
    "/api/resumes",
    requireAuth,
    (request, response, next) => {
      const contentType = request.headers["content-type"] || "";
      if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
        return response
          .status(400)
          .json({ error: "Resume upload must use multipart/form-data." });
      }
      return next();
    },
    require("express").raw({
      type: "multipart/form-data",
      limit: `${MAX_FILE_SIZE + 1024 * 1024}b`,
    }),
    async (request, response) => {
      const parsed = parseMultipartBody(
        request.body,
        request.headers["content-type"],
      );
      if (parsed.error) {
        return response.status(400).json({ error: parsed.error });
      }

      const resumeName = cleanResumeName(parsed.name);
      if (resumeName.error) {
        return response.status(400).json({ error: resumeName.error });
      }

      const { file } = parsed;
      if (file.buffer.length === 0 || file.buffer.length > MAX_FILE_SIZE) {
        return response
          .status(400)
          .json({ error: "Resume PDF must be between 1 byte and 5 MB." });
      }
      if (file.mimeType.toLowerCase() !== "application/pdf") {
        return response.status(400).json({ error: "Only PDF resumes are accepted." });
      }
      if (file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
        return response.status(400).json({ error: "The uploaded file is not a valid PDF." });
      }

      const userId = request.userId;
      const existingCount = await query(
        "SELECT COUNT(*)::int AS count FROM resumes WHERE user_id = $1",
        [userId],
      );
      const isDefault = existingCount.rows[0].count === 0;
      const storedFilename = `${crypto.randomUUID()}.pdf`;
      const filePath = getResumeFilePath(storedFilename);

      await fs.mkdir(uploadDirectory, { recursive: true });
      await fs.writeFile(filePath, file.buffer, { flag: "wx" });

      try {
        const result = await query(
          `INSERT INTO resumes
            (user_id, name, original_filename, file_path, mime_type, file_size, is_default)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, user_id, name, original_filename, file_path, mime_type,
                     file_size, is_default, created_at, updated_at`,
          [
            userId,
            resumeName.value,
            file.originalFilename,
            storedFilename,
            "application/pdf",
            file.buffer.length,
            isDefault,
          ],
        );
        return response.status(201).json(mapResume(result.rows[0]));
      } catch (error) {
        await fs.unlink(filePath).catch(() => {});
        throw error;
      }
    },
  );

  app.patch("/api/resumes/:id", requireAuth, async (request, response) => {
    const resumeId = parsePositiveId(request.params.id);
    if (!resumeId) {
      return response.status(404).json({ error: "Resume not found." });
    }

    if (
      !request.body ||
      typeof request.body !== "object" ||
      Array.isArray(request.body)
    ) {
      return response.status(400).json({ error: "Request body must be a JSON object." });
    }

    const allowedFields = ["name", "isDefault"];
    const unknownField = Object.keys(request.body).find(
      (field) => !allowedFields.includes(field),
    );
    if (unknownField) {
      return response.status(400).json({ error: `Unknown field: ${unknownField}.` });
    }
    if (!Object.keys(request.body).length) {
      return response.status(400).json({ error: "At least one field is required." });
    }

    const userId = request.userId;
    const existingResume = await getResumeForUser(query, resumeId, userId);
    if (!existingResume) {
      return response.status(404).json({ error: "Resume not found." });
    }

    let name = existingResume.name;
    if (Object.prototype.hasOwnProperty.call(request.body, "name")) {
      const validatedName = cleanResumeName(request.body.name);
      if (validatedName.error) {
        return response.status(400).json({ error: validatedName.error });
      }
      name = validatedName.value;
    }

    let isDefault = existingResume.is_default;
    if (Object.prototype.hasOwnProperty.call(request.body, "isDefault")) {
      if (typeof request.body.isDefault !== "boolean") {
        return response.status(400).json({ error: "isDefault must be a boolean." });
      }
      isDefault = request.body.isDefault;
    }

    if (isDefault) {
      await query(
        "UPDATE resumes SET is_default = FALSE, updated_at = NOW() WHERE user_id = $1",
        [userId],
      );
    }

    const result = await query(
      `UPDATE resumes
       SET name = $1, is_default = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING id, user_id, name, original_filename, file_path, mime_type,
                 file_size, is_default, created_at, updated_at`,
      [name, isDefault, resumeId, userId],
    );
    return response.json(mapResume(result.rows[0]));
  });

  app.delete("/api/resumes/:id", requireAuth, async (request, response) => {
    const resumeId = parsePositiveId(request.params.id);
    if (!resumeId) {
      return response.status(404).json({ error: "Resume not found." });
    }

    const userId = request.userId;
    const existingResume = await getResumeForUser(query, resumeId, userId);
    if (!existingResume) {
      return response.status(404).json({ error: "Resume not found." });
    }

    await fs.unlink(getResumeFilePath(existingResume.file_path)).catch((error) => {
      if (error.code !== "ENOENT") {
        throw error;
      }
    });
    await query("DELETE FROM resumes WHERE id = $1 AND user_id = $2", [
      resumeId,
      userId,
    ]);
    return response.status(204).end();
  });

  app.get("/api/resumes/:id/download", requireAuth, async (request, response, next) => {
    const resumeId = parsePositiveId(request.params.id);
    if (!resumeId) {
      return response.status(404).json({ error: "Resume not found." });
    }

    const userId = request.userId;
    const resume = await getResumeForUser(query, resumeId, userId);
    if (!resume) {
      return response.status(404).json({ error: "Resume not found." });
    }

    return response.download(
      getResumeFilePath(resume.file_path),
      cleanOriginalFilename(resume.original_filename),
      (error) => {
        if (error && !response.headersSent) {
          next(error);
        }
      },
    );
  });
}

module.exports = {
  MAX_FILE_SIZE,
  registerResumeRoutes,
};