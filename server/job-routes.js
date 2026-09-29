const ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs";

// Comprehensive catalog of recognized technical & professional skills for deterministic matching
const SKILL_CATALOG = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin",
  "React", "React Native", "Next.js", "Vue", "Angular", "Svelte", "Redux", "Tailwind", "HTML", "CSS", "Sass",
  "Node.js", "Express", "NestJS", "FastAPI", "Django", "Flask", "Spring Boot", "Ruby on Rails", "REST", "GraphQL", "gRPC",
  "PostgreSQL", "MySQL", "SQLite", "MongoDB", "Redis", "Cassandra", "DynamoDB", "Firebase", "Supabase", "SQL",
  "Docker", "Kubernetes", "AWS", "Google Cloud", "GCP", "Azure", "Terraform", "CI/CD", "GitHub Actions", "Linux", "Git",
  "Microservices", "System Design", "Unit Testing", "Jest", "Cypress", "Playwright", "Vitest", "Agile", "Scrum",
  "API Design", "Fullstack", "Frontend", "Backend", "DevOps", "Machine Learning", "AI", "OAuth", "Security",
];

function extractSkillsFromText(text) {
  if (!text) return [];
  const normalized = ` ${text.toLowerCase().replace(/[^a-z0-9#+.]/g, " ")} `;
  const found = new Set();

  for (const skill of SKILL_CATALOG) {
    const sLower = skill.toLowerCase();
    const escaped = sLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?:^|[^a-z0-9#+.])${escaped}(?:$|[^a-z0-9#+.])`, "i");
    if (regex.test(normalized)) {
      found.add(skill);
    }
  }

  return Array.from(found);
}

function calculateDeterministicMatch(candidateSkills, jobSkills, candidateRole, jobTitle) {
  const normCandidateSkills = new Set(candidateSkills.map((s) => s.toLowerCase()));
  const matchingSkills = [];
  const missingSkills = [];

  jobSkills.forEach((skill) => {
    if (normCandidateSkills.has(skill.toLowerCase())) {
      matchingSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  });

  // Calculate skill score (weight up to 55 points)
  let skillScore = 0;
  if (jobSkills.length > 0) {
    skillScore = (matchingSkills.length / jobSkills.length) * 55;
  } else {
    skillScore = candidateSkills.length > 0 ? 35 : 20;
  }

  // Calculate title alignment (weight up to 30 points)
  let titleScore = 15;
  if (jobTitle && candidateRole) {
    const titleWords = jobTitle.toLowerCase().split(/\s+/);
    const roleWords = candidateRole.toLowerCase().split(/\s+/);
    const hasOverlap = roleWords.some((rw) => rw.length > 3 && titleWords.includes(rw));
    if (hasOverlap) {
      titleScore = 30;
    }
  }

  // Base score 15 points
  const baseScore = 15;

  let totalScore = Math.round(skillScore + titleScore + baseScore);
  totalScore = Math.max(40, Math.min(totalScore, 98));

  // Generate concise explanation
  let explanation = "";
  if (matchingSkills.length > 0) {
    const highlights = matchingSkills.slice(0, 3).join(", ");
    if (missingSkills.length > 0) {
      explanation = `Strong match with your ${highlights} experience. Key requirements to review: ${missingSkills.slice(0, 2).join(", ")}.`;
    } else {
      explanation = `Excellent alignment! You match key requirements including ${highlights}.`;
    }
  } else if (jobSkills.length > 0) {
    explanation = `Relevant opportunity. Mentions requirements like ${missingSkills.slice(0, 3).join(", ")}.`;
  } else {
    explanation = "Good general alignment with modern engineering roles.";
  }

  return {
    matchPercentage: totalScore,
    matchingSkills,
    missingSkills,
    explanation,
  };
}

// Fetch live jobs directly from Adzuna API
async function fetchAdzunaJobs({ what, where, country = "in", resultsPerPage = 15 }) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    const error = new Error("Adzuna credentials are not configured. Please ensure ADZUNA_APP_ID and ADZUNA_APP_KEY are set.");
    error.statusCode = 503;
    throw error;
  }

  const endpoint = `${ADZUNA_BASE_URL}/${country}/search/1`;
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: String(resultsPerPage),
  });

  if (what) params.set("what", what);
  if (where) params.set("where", where);

  const response = await fetch(`${endpoint}?${params.toString()}`);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    const error = new Error(
      `Adzuna API request failed with status ${response.status}. ${errorText ? errorText.slice(0, 120) : ""}`,
    );
    error.statusCode = 502;
    throw error;
  }

  const data = await response.json();
  return data.results || [];
}

function registerJobRoutes(app, { query, requireAuth }) {
  // 1. GET /api/jobs/recommendations — Real Adzuna Search & Deterministic Matching
  app.get("/api/jobs/recommendations", requireAuth, async (req, res, next) => {
    try {
      const userId = req.userId;
      const what = (req.query.what || "Software Engineer").trim();
      const where = (req.query.where || "").trim();
      const resumeId = req.query.resumeId ? Number(req.query.resumeId) : null;
      const country = (req.query.country || "in").toLowerCase();

      // Retrieve user's saved jobs and existing applications to mark state flags
      const [savedJobsResult, applicationsResult] = await Promise.all([
        query("SELECT id, job_url FROM saved_jobs WHERE user_id = $1", [userId]),
        query("SELECT id, job_url, company_name, job_title FROM job_applications WHERE user_id = $1", [userId]),
      ]);

      const savedUrlMap = new Map(savedJobsResult.rows.map((row) => [row.job_url, row.id]));
      const appliedUrlSet = new Set(
        applicationsResult.rows.filter((r) => r.job_url).map((r) => r.job_url),
      );

      // Extract candidate skills from resume if provided, otherwise default profile
      let candidateSkills = ["JavaScript", "TypeScript", "React", "Node.js", "PostgreSQL", "Git", "REST", "SQL"];
      let candidateRole = what;

      if (resumeId) {
        const resumeRes = await query(
          "SELECT id, name, original_filename, file_path FROM resumes WHERE id = $1 AND user_id = $2",
          [resumeId, userId],
        );
        if (resumeRes.rows.length > 0) {
          const r = resumeRes.rows[0];
          const resumeText = `${r.name} ${r.original_filename}`;
          const inferred = extractSkillsFromText(resumeText);
          if (inferred.length > 0) {
            candidateSkills = Array.from(new Set([...candidateSkills, ...inferred]));
          }
        }
      }

      // Query real Adzuna API — NO fake fallbacks!
      const rawJobs = await fetchAdzunaJobs({ what, where, country, resultsPerPage: 15 });

      // Transform every Adzuna result, strictly preserving specific redirect_url
      const recommendations = rawJobs.map((item) => {
        const id = String(item.id);
        const title = item.title || "Job Opportunity";
        const company = item.company?.display_name || "Company";
        const location = item.location?.display_name || (where || "India");
        const description = item.description || "";
        const jobUrl = item.redirect_url; // CRITICAL: EXACT Adzuna redirect URL!
        const salaryMin = item.salary_min || null;
        const salaryMax = item.salary_max || null;
        const created = item.created || new Date().toISOString();

        let salaryFormatted = null;
        if (salaryMin && salaryMax) {
          salaryFormatted = `₹${Math.round(salaryMin).toLocaleString()} - ₹${Math.round(salaryMax).toLocaleString()} / yr`;
        } else if (salaryMin) {
          salaryFormatted = `From ₹${Math.round(salaryMin).toLocaleString()} / yr`;
        }

        const jobSkills = extractSkillsFromText(`${title} ${description}`);
        const matchData = calculateDeterministicMatch(candidateSkills, jobSkills, candidateRole, title);

        const savedJobId = savedUrlMap.get(jobUrl) || null;
        const hasApplied = appliedUrlSet.has(jobUrl);

        return {
          externalId: id,
          id,
          jobTitle: title,
          title,
          companyName: company,
          company,
          location,
          salaryMin,
          salaryMax,
          salaryFormatted,
          description,
          jobUrl, // Specific Adzuna posting URL
          created,
          jobSkills,
          matchPercentage: matchData.matchPercentage,
          matchingSkills: matchData.matchingSkills,
          missingSkills: matchData.missingSkills,
          explanation: matchData.explanation,
          isSaved: Boolean(savedJobId),
          savedJobId,
          hasApplied,
        };
      });

      // Rank recommendations by match percentage descending
      recommendations.sort((a, b) => b.matchPercentage - a.matchPercentage);

      res.json({
        success: true,
        source: "adzuna_live",
        count: recommendations.length,
        jobs: recommendations,
      });
    } catch (error) {
      console.error("[Adzuna Recommendation Error]:", error.message);
      res.status(error.statusCode || 502).json({
        success: false,
        error: error.message || "Live job search from Adzuna is temporarily unavailable.",
      });
    }
  });

  // 2. GET /api/saved-jobs — Retrieve all bookmarked jobs for authenticated user
  app.get("/api/saved-jobs", requireAuth, async (req, res, next) => {
    try {
      const userId = req.userId;
      const result = await query(
        `SELECT id, user_id, external_id, company_name, job_title, location,
                salary_min, salary_max, job_url, description, skills, match_percentage, created_at
         FROM saved_jobs
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId],
      );

      const appsResult = await query(
        "SELECT job_url FROM job_applications WHERE user_id = $1 AND job_url IS NOT NULL",
        [userId],
      );
      const appliedUrls = new Set(appsResult.rows.map((r) => r.job_url));

      const formatted = result.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        externalId: row.external_id,
        companyName: row.company_name,
        jobTitle: row.job_title,
        location: row.location,
        salaryMin: row.salary_min ? Number(row.salary_min) : null,
        salaryMax: row.salary_max ? Number(row.salary_max) : null,
        jobUrl: row.job_url, // Exact specific URL
        description: row.description,
        skills: row.skills ? (typeof row.skills === "string" && row.skills.startsWith("[") ? JSON.parse(row.skills) : [row.skills]) : [],
        matchPercentage: row.match_percentage,
        createdAt: row.created_at,
        hasApplied: appliedUrls.has(row.job_url),
      }));

      res.json(formatted);
    } catch (error) {
      next(error);
    }
  });

  // 3. POST /api/saved-jobs — Save a job recommendation
  app.post("/api/saved-jobs", requireAuth, async (req, res, next) => {
    try {
      const userId = req.userId;
      const {
        externalId,
        companyName,
        jobTitle,
        location,
        salaryMin,
        salaryMax,
        jobUrl,
        description,
        skills,
        matchPercentage,
      } = req.body;

      if (!companyName || !jobTitle || !jobUrl) {
        return res.status(400).json({ error: "Company name, job title, and job URL are required." });
      }

      // Check if already saved by this user
      const existing = await query(
        "SELECT id FROM saved_jobs WHERE user_id = $1 AND job_url = $2",
        [userId, jobUrl],
      );

      if (existing.rows.length > 0) {
        return res.status(200).json({ id: existing.rows[0].id, alreadySaved: true });
      }

      const skillsString = Array.isArray(skills) ? JSON.stringify(skills) : (skills || null);

      const result = await query(
        `INSERT INTO saved_jobs
          (user_id, external_id, company_name, job_title, location, salary_min, salary_max, job_url, description, skills, match_percentage)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, user_id, external_id, company_name, job_title, location,
                   salary_min, salary_max, job_url, description, skills, match_percentage, created_at`,
        [
          userId,
          externalId || null,
          companyName.trim(),
          jobTitle.trim(),
          location ? location.trim() : null,
          salaryMin ? Number(salaryMin) : null,
          salaryMax ? Number(salaryMax) : null,
          jobUrl.trim(),
          description || null,
          skillsString,
          matchPercentage ? Number(matchPercentage) : null,
        ],
      );

      const row = result.rows[0];
      return res.status(201).json({
        id: row.id,
        userId: row.user_id,
        externalId: row.external_id,
        companyName: row.company_name,
        jobTitle: row.job_title,
        location: row.location,
        salaryMin: row.salary_min ? Number(row.salary_min) : null,
        salaryMax: row.salary_max ? Number(row.salary_max) : null,
        jobUrl: row.job_url,
        description: row.description,
        skills: Array.isArray(skills) ? skills : [],
        matchPercentage: row.match_percentage,
        createdAt: row.created_at,
      });
    } catch (error) {
      next(error);
    }
  });

  // 4. DELETE /api/saved-jobs/:id — Remove a saved job
  app.delete("/api/saved-jobs/:id", requireAuth, async (req, res, next) => {
    try {
      const userId = req.userId;
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(404).json({ error: "Saved job not found." });
      }

      const result = await query(
        "DELETE FROM saved_jobs WHERE id = $1 AND user_id = $2",
        [id, userId],
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Saved job not found." });
      }

      return res.status(204).end();
    } catch (error) {
      next(error);
    }
  });
}

module.exports = {
  registerJobRoutes,
};
