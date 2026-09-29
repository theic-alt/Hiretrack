const express = require("express");
const multer = require("multer");
const { GoogleGenAI } = require("@google/genai");

const router = express.Router();
router.get("/ping", (_req, res) => {
  res.json({
    success: true,
    message: "AI router is connected",
  });
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF CV files are allowed."));
    }

    cb(null, true);
  },
});

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const candidateSchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
    },
    email: {
      type: "string",
    },
    phone: {
      type: "string",
    },
    location: {
      type: "string",
    },
    summary: {
      type: "string",
    },
    skills: {
      type: "array",
      items: {
        type: "string",
      },
    },
    experienceYears: {
      type: "number",
    },
    education: {
      type: "array",
      items: {
        type: "string",
      },
    },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company: {
            type: "string",
          },
          role: {
            type: "string",
          },
          duration: {
            type: "string",
          },
          description: {
            type: "string",
          },
        },
        required: ["company", "role", "duration", "description"],
      },
    },
    projects: {
      type: "array",
      items: {
        type: "string",
      },
    },
    certifications: {
      type: "array",
      items: {
        type: "string",
      },
    },
    targetRoles: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
  required: [
    "name",
    "email",
    "phone",
    "location",
    "summary",
    "skills",
    "experienceYears",
    "education",
    "experience",
    "projects",
    "certifications",
    "targetRoles",
  ],
};

router.post("/analyze-resume", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "Please upload a PDF CV.",
      });
    }

    const pdfData = req.file.buffer.toString("base64");

    const prompt = `
Analyze this candidate's CV for a job recommendation system.

Extract only information that is actually present in the CV.

Do not invent:
- skills
- companies
- job titles
- education
- years of experience
- certifications
- projects
- contact information

If information is missing, return an empty string, empty array, or 0 where appropriate.

For targetRoles, infer reasonable job roles ONLY from the candidate's documented skills, education, projects, and experience.

Return the candidate information using the provided JSON schema.
`;

    const interaction = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input: [
        {
          type: "document",
          data: pdfData,
          mime_type: "application/pdf",
        },
        {
          type: "text",
          text: prompt,
        },
      ],
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: candidateSchema,
      },
    });

    const candidateProfile = JSON.parse(interaction.output_text);

    return res.json({
      success: true,
      candidate: candidateProfile,
    });
  } catch (error) {
    console.error("Resume analysis error:", error);

    if (error.message?.includes("File too large")) {
      return res.status(400).json({
        error: "CV file is too large. Maximum size is 5 MB.",
      });
    }

    return res.status(500).json({
      error: "Unable to analyze the CV right now.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});
router.get("/test", async (req, res) => {
  try {
    const interaction = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input: "Reply with exactly: HireTrack Gemini connection successful",
    });

    res.json({
      success: true,
      message: interaction.output_text,
    });
  } catch (error) {
    console.error("Gemini test error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
