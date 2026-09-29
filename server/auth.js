const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "hiretrack-production-jwt-secret-key-2026-secure-auth-token-salt";

function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
}

function createRequireAuth(query) {
  return async function requireAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      let token = null;

      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7).trim();
      } else if (req.headers["x-auth-token"]) {
        token = String(req.headers["x-auth-token"]).trim();
      } else if (req.query && req.query.token) {
        token = String(req.query.token).trim();
      }

      if (!token) {
        return res.status(401).json({
          error: "Authentication required. Please log in to continue.",
        });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return res.status(401).json({
          error: "Invalid or expired session. Please log in again.",
        });
      }

      const userId = Number(decoded.userId);
      if (!userId || !Number.isInteger(userId)) {
        return res.status(401).json({
          error: "Malformed session credentials. Please log in again.",
        });
      }

      // Verify user exists in the database
      const userResult = await query(
        "SELECT id, name, email, created_at FROM users WHERE id = $1",
        [userId],
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          error: "User account no longer exists. Please sign up or log in.",
        });
      }

      req.user = userResult.rows[0];
      req.userId = userResult.rows[0].id;
      next();
    } catch (error) {
      console.error("[Auth Error]:", error.message);
      return res.status(500).json({ error: "Authentication verification failed." });
    }
  };
}

function registerAuthRoutes(app, { query }) {
  // 1. POST /api/auth/signup
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { name, email, password, confirmPassword } = req.body || {};

      // Validate required fields
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Full name, email, and password are required." });
      }

      const trimmedName = String(name).trim();
      const trimmedEmail = String(email).trim().toLowerCase();

      if (trimmedName.length < 2) {
        return res.status(400).json({ error: "Name must be at least 2 characters long." });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return res.status(400).json({ error: "Please enter a valid email address." });
      }

      // Password minimum length validation
      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long." });
      }

      // Confirm password validation
      if (confirmPassword !== undefined && password !== confirmPassword) {
        return res.status(400).json({ error: "Passwords do not match." });
      }

      // Duplicate email validation (case-insensitive)
      const existingUser = await query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [
        trimmedEmail,
      ]);

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: "An account with this email address already exists." });
      }

      // Secure password hashing
      const passwordHash = await bcrypt.hash(password, 10);

      const insertResult = await query(
        "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at",
        [trimmedName, trimmedEmail, passwordHash],
      );

      const newUser = insertResult.rows[0];
      const token = generateToken(newUser);

      return res.status(201).json({
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        },
        token,
      });
    } catch (error) {
      console.error("[Sign Up Error]:", error);
      return res.status(500).json({ error: "Failed to create account. Please try again." });
    }
  });

  // 2. POST /api/auth/login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
      }

      const trimmedEmail = String(email).trim().toLowerCase();

      // Look up user by email
      const userResult = await query(
        "SELECT id, name, email, password_hash FROM users WHERE LOWER(email) = LOWER($1)",
        [trimmedEmail],
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: "Invalid email or password." });
      }

      const user = userResult.rows[0];

      if (!user.password_hash) {
        return res.status(401).json({
          error: "This account has not set up password authentication. Please sign up or contact support.",
        });
      }

      const isMatch = await bcrypt.compare(String(password), user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid email or password." });
      }

      const token = generateToken(user);

      return res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        token,
      });
    } catch (error) {
      console.error("[Login Error]:", error);
      return res.status(500).json({ error: "Login failed. Please try again." });
    }
  });

  // 3. GET /api/auth/me (Protected route)
  const requireAuth = createRequireAuth(query);
  app.get("/api/auth/me", requireAuth, (req, res) => {
    return res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
      },
    });
  });

  // 4. POST /api/auth/logout
  app.post("/api/auth/logout", (_req, res) => {
    return res.json({ success: true, message: "Logged out successfully." });
  });
}

module.exports = {
  createRequireAuth,
  registerAuthRoutes,
};
