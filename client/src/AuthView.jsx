import { useState } from "react";
import { login, signUp } from "./api";

export default function AuthView({ onAuthenticated }) {
  const [mode, setMode] = useState("login"); // "login" or "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function switchMode(newMode) {
    setMode(newMode);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    if (mode === "signup") {
      const trimmedName = name.trim();
      if (!trimmedName || trimmedName.length < 2) {
        setError("Please enter your full name (minimum 2 characters).");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setError("Please enter a valid email address.");
        return;
      }

      if (password.length < 8) {
        setError("Password must be at least 8 characters long.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match. Please re-enter.");
        return;
      }

      setLoading(true);
      try {
        const data = await signUp({
          name: trimmedName,
          email: trimmedEmail,
          password,
          confirmPassword,
        });
        if (data?.user) {
          onAuthenticated(data.user);
        }
      } catch (err) {
        setError(err.message || "Failed to create account. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        const data = await login({
          email: trimmedEmail,
          password,
        });
        if (data?.user) {
          onAuthenticated(data.user);
        }
      } catch (err) {
        setError(err.message || "Invalid email or password.");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="auth-viewport">
      {/* Background ambient lighting */}
      <div className="ambient-glow ambient-glow-1" />
      <div className="ambient-glow ambient-glow-2" />
      <div className="ambient-grid-overlay" />

      <div className="auth-layout-container">
        {/* Left Hero Section */}
        <div className="auth-hero-pane">
          <div className="auth-hero-brand">
            <div className="brand-logo-mark">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 6C4 4.89543 4.89543 4 6 4H10C11.1046 4 12 4.89543 12 6V18C12 19.1046 11.1046 20 10 20H6C4.89543 20 4 19.1046 4 18V6Z"
                  fill="url(#brandGrad1)"
                />
                <path
                  d="M12 10C12 8.89543 12.8954 8 14 8H18C19.1046 8 20 8.89543 20 10V18C20 19.1046 19.1046 20 18 20H14C12.8954 20 12 19.1046 12 18V10Z"
                  fill="url(#brandGrad2)"
                />
                <defs>
                  <linearGradient id="brandGrad1" x1="4" y1="4" x2="12" y2="20" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#818CF8" />
                    <stop offset="1" stopColor="#4F46E5" />
                  </linearGradient>
                  <linearGradient id="brandGrad2" x1="12" y1="8" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#C084FC" />
                    <stop offset="1" stopColor="#7C3AED" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="brand-name">HireTrack</span>
            <span className="brand-tag">OS 2.0</span>
          </div>

          <div className="hero-text-block">
            <h1 className="hero-headline">
              Your entire job search.
              <span className="headline-gradient-text"> One intelligent workspace.</span>
            </h1>
            <p className="hero-subtext">
              Track multi-stage applications, run deterministic CV match scoring on real Adzuna postings,
              and prepare for every interview with timeline precision.
            </p>
          </div>

          {/* Interactive Visual Floating Cards */}
          <div className="hero-floating-cards" aria-hidden="true">
            {/* Card 1: Live AI Match */}
            <div className="hero-preview-card card-match-preview">
              <div className="preview-card-header">
                <div className="preview-badge-ai">
                  <span className="pulse-indicator" />
                  <span>97% Match</span>
                </div>
                <span className="preview-label">Live Adzuna Match</span>
              </div>
              <div className="preview-role-title">Staff Fullstack Engineer</div>
              <div className="preview-meta">Bengaluru · Remote Allowed · ₹28L - ₹42L</div>
              <div className="preview-skills">
                <span className="preview-skill-tag">✓ TypeScript</span>
                <span className="preview-skill-tag">✓ React</span>
                <span className="preview-skill-tag">✓ PostgreSQL</span>
              </div>
            </div>

            {/* Card 2: Interview Countdown */}
            <div className="hero-preview-card card-interview-preview">
              <div className="preview-interview-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="preview-interview-info">
                <strong>System Design Interview</strong>
                <span>Tomorrow at 2:00 PM · Google Meet</span>
              </div>
              <span className="preview-status-pill">Scheduled</span>
            </div>
          </div>

          <div className="hero-trust-metrics">
            <div className="trust-metric-item">
              <span className="trust-value">100%</span>
              <span className="trust-label">Real Adzuna Postings</span>
            </div>
            <div className="trust-metric-divider" />
            <div className="trust-metric-item">
              <span className="trust-value">Deterministic</span>
              <span className="trust-label">Skill Alignment Engine</span>
            </div>
            <div className="trust-metric-divider" />
            <div className="trust-metric-item">
              <span className="trust-value">PostgreSQL</span>
              <span className="trust-label">Encrypted Persistence</span>
            </div>
          </div>
        </div>

        {/* Right Auth Card Section */}
        <div className="auth-form-pane">
          <div className="auth-glass-panel">
            {/* Mode Switcher Tabs */}
            <div className="auth-mode-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                className={`auth-tab-btn ${mode === "login" ? "active" : ""}`}
                onClick={() => switchMode("login")}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signup"}
                className={`auth-tab-btn ${mode === "signup" ? "active" : ""}`}
                onClick={() => switchMode("signup")}
              >
                Create Account
              </button>
            </div>

            <div className="auth-panel-heading">
              <h2>{mode === "login" ? "Welcome back" : "Get started with HireTrack"}</h2>
              <p>
                {mode === "login"
                  ? "Enter your credentials to access your unified job workspace."
                  : "Create your isolated workspace and start discovering matched opportunities."}
              </p>
            </div>

            {error && (
              <div className="auth-error-banner" role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form-stack" noValidate>
              {mode === "signup" && (
                <div className="form-input-group">
                  <label htmlFor="auth-name">Full Name</label>
                  <div className="input-wrapper">
                    <input
                      id="auth-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Morgan"
                      required
                      autoComplete="name"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              <div className="form-input-group">
                <label htmlFor="auth-email">Email Address</label>
                <div className="input-wrapper">
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@company.com"
                    required
                    autoComplete="email"
                    autoFocus={mode === "login"}
                  />
                </div>
              </div>

              <div className="form-input-group">
                <div className="field-label-row">
                  <label htmlFor="auth-password">Password</label>
                  {mode === "signup" && (
                    <span className="field-hint">Min 8 characters</span>
                  )}
                </div>
                <div className="input-wrapper has-trailing-action">
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {mode === "signup" && (
                <div className="form-input-group">
                  <label htmlFor="auth-confirm-password">Confirm Password</label>
                  <div className="input-wrapper has-trailing-action">
                    <input
                      id="auth-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary-action auth-submit-btn"
              >
                {loading ? (
                  <span className="btn-spinner-row">
                    <span className="mini-spinner" />
                    <span>{mode === "login" ? "Signing In..." : "Creating Account..."}</span>
                  </span>
                ) : (
                  <span>{mode === "login" ? "Sign In to Workspace" : "Create Account"}</span>
                )}
              </button>
            </form>

            <div className="auth-card-footer">
              {mode === "login" ? (
                <p>
                  Don't have an account yet?{" "}
                  <button
                    type="button"
                    className="inline-link-btn"
                    onClick={() => switchMode("signup")}
                  >
                    Sign up now
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="inline-link-btn"
                    onClick={() => switchMode("login")}
                  >
                    Sign in here
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
