import { useCallback, useEffect, useMemo, useState } from "react";
import AuthView from "./AuthView";
import {
  getCurrentUser,
  logout,
  getAuthToken,
  createApplication,
  deleteApplication,
  getApplications,
  updateApplication,
  createInterview,
  deleteInterview,
  getInterviews,
  updateInterview,
  deleteResume,
  getResumeDownloadUrl,
  getResumes,
  updateResume,
  uploadResume,
  getJobRecommendations,
  getSavedJobs,
  saveJob,
  deleteSavedJob,
} from "./api";
import "./index.css";

const applicationStatuses = [
  { id: "saved", label: "Saved", color: "#64748b" },
  { id: "applied", label: "Applied", color: "#3b82f6" },
  { id: "interviewing", label: "Interviewing", color: "#8b5cf6" },
  { id: "offer", label: "Offer", color: "#10b981" },
  { id: "accepted", label: "Accepted", color: "#06b6d4" },
  { id: "rejected", label: "Rejected", color: "#f43f5e" },
  { id: "withdrawn", label: "Withdrawn", color: "#475569" },
];

const statusMap = Object.fromEntries(applicationStatuses.map((s) => [s.id, s]));

const interviewTypes = [
  { id: "video", label: "Video Call", icon: "📹" },
  { id: "phone", label: "Phone Screen", icon: "📞" },
  { id: "onsite", label: "Onsite", icon: "🏢" },
  { id: "take_home", label: "Take-home Assessment", icon: "💻" },
  { id: "other", label: "Other", icon: "📋" },
];

const interviewTypeMap = Object.fromEntries(interviewTypes.map((t) => [t.id, t.label]));

function formatDate(value) {
  if (!value) return "No date";
  const dateValue = String(value).includes("T") ? value : `${value}T00:00:00Z`;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(dateValue));
}

function formatDateTime(value) {
  if (!value) return "Date not set";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getInitialTheme() {
  try {
    const saved = localStorage.getItem("hiretrack_theme");
    return saved === "light" ? "light" : "dark";
  } catch (e) {
    return "dark";
  }
}

// -------------------------------------------------------------
// CIRCULAR MATCH RING COMPONENT
// -------------------------------------------------------------
function CircularMatchRing({ percentage }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let strokeColor = "#10b981"; // high
  if (percentage < 65) strokeColor = "#f59e0b";
  else if (percentage < 80) strokeColor = "#6366f1";

  return (
    <div className="match-ring-wrapper" title={`${percentage}% Algorithmic CV Match`}>
      <svg className="match-ring-svg" viewBox="0 0 64 64">
        <circle
          className="match-ring-bg"
          cx="32"
          cy="32"
          r={radius}
          strokeWidth="5"
          fill="none"
        />
        <circle
          className="match-ring-fill"
          cx="32"
          cy="32"
          r={radius}
          strokeWidth="5"
          fill="none"
          stroke={strokeColor}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <div className="match-ring-center-text">
        <span className="match-percent-num">{percentage}%</span>
        <span className="match-ai-label">MATCH</span>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// RECOMMENDATION CARD COMPONENT
// -------------------------------------------------------------
function RecommendationCard({ job, isSaved, hasApplied, onApply, onToggleSave, saving }) {
  const companyInitial = job.companyName ? job.companyName.charAt(0).toUpperCase() : "C";

  return (
    <article className="premium-job-card">
      <div>
        <div className="job-card-top-row">
          <div className="job-company-identity">
            <div className="company-logo-avatar">{companyInitial}</div>
            <div className="company-title-info">
              <h3>{job.jobTitle}</h3>
              <span className="company-name-text">{job.companyName}</span>
            </div>
          </div>
          <CircularMatchRing percentage={job.matchPercentage || 75} />
        </div>

        <div className="job-meta-chips-row" style={{ marginTop: "14px" }}>
          <span className="meta-chip-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {job.location || "Remote"}
          </span>
          {job.salaryFormatted && (
            <span className="meta-chip-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                <path d="M12 18V6" />
              </svg>
              {job.salaryFormatted}
            </span>
          )}
          {job.created && (
            <span className="meta-chip-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {formatDate(job.created)}
            </span>
          )}
        </div>

        {job.explanation && (
          <div className="match-insight-quote" style={{ marginTop: "12px" }}>
            <strong>Match Insight:</strong> {job.explanation}
          </div>
        )}

        {job.matchingSkills && job.matchingSkills.length > 0 && (
          <div className="job-skills-breakdown" style={{ marginTop: "12px" }}>
            <div className="skills-group-row">
              <span className="skills-group-title">Matched Skills</span>
              <div className="skill-pills-wrap">
                {job.matchingSkills.map((s) => (
                  <span key={s} className="skill-tag-match">
                    ✓ {s}
                  </span>
                ))}
              </div>
            </div>
            {job.missingSkills && job.missingSkills.length > 0 && (
              <div className="skills-group-row" style={{ marginTop: "6px" }}>
                <span className="skills-group-title">Key Requirements to Note</span>
                <div className="skill-pills-wrap">
                  {job.missingSkills.slice(0, 4).map((s) => (
                    <span key={s} className="skill-tag-missing">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="job-card-actions-row">
        <a
          className="btn-job-action btn-action-secondary"
          href={job.jobUrl}
          target="_blank"
          rel="noreferrer"
          title="Open exact job posting on Adzuna in new tab"
        >
          View Job ↗
        </a>
        <button
          type="button"
          className={`btn-job-action btn-action-secondary btn-action-bookmark ${isSaved ? "saved" : ""}`}
          onClick={() => onToggleSave(job)}
          disabled={saving}
          title={isSaved ? "Remove from saved jobs" : "Save this job"}
        >
          {saving ? "..." : isSaved ? "★ Saved" : "☆ Save"}
        </button>
        <button
          type="button"
          className="btn-job-action btn-action-primary"
          onClick={() => onApply(job)}
        >
          {hasApplied ? "Tracked ✓" : "+ Add to Tracker"}
        </button>
      </div>
    </article>
  );
}

// -------------------------------------------------------------
// MAIN APP COMPONENT
// -------------------------------------------------------------
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [theme, setTheme] = useState(getInitialTheme);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("dashboard");

  // Core Data
  const [applications, setApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [resumes, setResumes] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [interviewsMap, setInterviewsMap] = useState({});

  // Recommendations state
  const [recRole, setRecRole] = useState("Software Engineer");
  const [recLocation, setRecLocation] = useState("Bengaluru");
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState("");
  const [savingRecId, setSavingRecId] = useState(null);

  // App View & Filters
  const [viewMode, setViewMode] = useState("kanban"); // "kanban" or "list"
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals & Forms
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [editingInterviewAppId, setEditingInterviewAppId] = useState(null);
  const [editingInterview, setEditingInterview] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  // Sync theme to root
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("hiretrack_theme", theme);
    } catch (e) {
      // Ignore
    }
  }, [theme]);

  function toggleTheme() {
    setTheme((curr) => (curr === "dark" ? "light" : "dark"));
  }

  function showToast(msg) {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(""), 3500);
  }

  // 1. Check Authenticated Session on Load
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setAuthLoading(false);
      return;
    }

    getCurrentUser()
      .then((res) => {
        if (res?.user) {
          setCurrentUser(res.user);
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => {
        setCurrentUser(null);
      })
      .finally(() => {
        setAuthLoading(false);
      });

    function handleUnauthorized() {
      setCurrentUser(null);
    }

    window.addEventListener("hiretrack:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("hiretrack:unauthorized", handleUnauthorized);
  }, []);

  // 2. Fetch User Workspace Data
  const loadApplications = useCallback(async () => {
    setAppsLoading(true);
    try {
      const data = await getApplications();
      setApplications(data || []);

      // Fetch interviews for all applications
      if (Array.isArray(data) && data.length > 0) {
        const intMap = {};
        await Promise.all(
          data.map(async (app) => {
            try {
              const res = await getInterviews(app.id);
              intMap[app.id] = res || [];
            } catch (e) {
              intMap[app.id] = [];
            }
          }),
        );
        setInterviewsMap(intMap);
      } else {
        setInterviewsMap({});
      }
    } catch (err) {
      showToast(err.message || "Failed to load applications.");
    } finally {
      setAppsLoading(false);
    }
  }, []);

  const loadResumes = useCallback(async () => {
    try {
      const list = await getResumes();
      setResumes(list || []);
      const def = list?.find((r) => r.isDefault) || list?.[0];
      if (def && !selectedResumeId) {
        setSelectedResumeId(String(def.id));
      }
    } catch (e) {
      // Ignore
    }
  }, [selectedResumeId]);

  const loadSavedJobs = useCallback(async () => {
    try {
      const list = await getSavedJobs();
      setSavedJobs(list || []);
    } catch (e) {
      // Ignore
    }
  }, []);

  const loadRecommendations = useCallback(
    async (roleQuery, locQuery) => {
      setRecsLoading(true);
      setRecsError("");
      try {
        const queryRole = roleQuery !== undefined ? roleQuery : recRole;
        const queryLoc = locQuery !== undefined ? locQuery : recLocation;

        const res = await getJobRecommendations({
          what: queryRole,
          where: queryLoc,
          resumeId: selectedResumeId || undefined,
        });

        if (res?.jobs) {
          setRecommendations(res.jobs);
        } else {
          setRecommendations([]);
        }
      } catch (err) {
        setRecsError(err.message || "Live Adzuna job search is temporarily unavailable.");
      } finally {
        setRecsLoading(false);
      }
    },
    [recRole, recLocation, selectedResumeId],
  );

  useEffect(() => {
    if (currentUser) {
      loadApplications();
      loadResumes();
      loadSavedJobs();
      loadRecommendations();
    }
  }, [currentUser, loadApplications, loadResumes, loadSavedJobs, loadRecommendations]);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      setCurrentUser(null);
      setApplications([]);
      setResumes([]);
      setSavedJobs([]);
      setInterviewsMap({});
      showToast("Logged out successfully.");
    }
  }

  // Pre-fill application from Job Recommendation
  function handleApplyFromRecommendation(jobData) {
    const existing = applications.find(
      (a) =>
        (jobData.jobUrl && a.jobUrl === jobData.jobUrl) ||
        (a.companyName.toLowerCase() === (jobData.companyName || "").toLowerCase() &&
          a.jobTitle.toLowerCase() === (jobData.jobTitle || "").toLowerCase()),
    );

    if (existing) {
      showToast(`Already tracking ${existing.jobTitle} at ${existing.companyName}.`);
      scrollToNav("applications");
      return;
    }

    const defaultResume = resumes.find((r) => r.isDefault) || resumes[0];

    setEditingApp({
      companyName: jobData.companyName || "",
      jobTitle: jobData.jobTitle || "",
      location: jobData.location || "",
      jobUrl: jobData.jobUrl || "",
      status: "applied",
      resumeId: defaultResume ? defaultResume.id : "",
      appliedAt: new Date().toISOString().slice(0, 10),
      notes: jobData.matchPercentage
        ? `Found via AI Job Matches (${jobData.matchPercentage}% match). Skills: ${jobData.matchingSkills?.join(", ") || "General alignment"}`
        : "Found via Job Recommendations",
    });

    setAppModalOpen(true);
  }

  // Bookmark / Save Recommendation Toggle
  async function handleToggleSaveRecommendation(job) {
    const isSaved = savedJobs.some((s) => s.jobUrl === job.jobUrl);
    setSavingRecId(job.id);
    try {
      if (isSaved) {
        const found = savedJobs.find((s) => s.jobUrl === job.jobUrl);
        if (found) {
          await deleteSavedJob(found.id);
          showToast("Job removed from bookmarks.");
          await loadSavedJobs();
        }
      } else {
        await saveJob({
          externalId: job.externalId || job.id,
          companyName: job.companyName || job.company,
          jobTitle: job.jobTitle || job.title,
          location: job.location,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          jobUrl: job.jobUrl,
          description: job.description,
          skills: job.matchingSkills || [],
          matchPercentage: job.matchPercentage,
        });
        showToast("Job saved to bookmarks.");
        await loadSavedJobs();
      }
    } catch (err) {
      showToast(err.message || "Failed to update bookmark.");
    } finally {
      setSavingRecId(null);
    }
  }

  // Navigation scroll helper
  function scrollToNav(targetId) {
    setActiveNav(targetId);
    setMobileMenuOpen(false);
    const el = document.getElementById(`${targetId}-section`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // Derived Statistics
  const stats = useMemo(() => {
    const totalApps = applications.length;
    let totalInterviews = 0;
    Object.values(interviewsMap).forEach((list) => {
      totalInterviews += (list || []).length;
    });

    const activeInterviews = applications.filter((a) => a.status === "interviewing").length;
    const offers = applications.filter((a) => a.status === "offer" || a.status === "accepted").length;
    const savedCount = savedJobs.length;

    // Response rate: (interviewing + offers + accepted + rejected) / (total applications applied)
    const appliedCount = applications.filter((a) => a.status !== "saved").length;
    const respondedCount = applications.filter(
      (a) =>
        a.status === "interviewing" ||
        a.status === "offer" ||
        a.status === "accepted" ||
        a.status === "rejected",
    ).length;

    const responseRate = appliedCount > 0 ? Math.round((respondedCount / appliedCount) * 100) : 0;

    return {
      totalApps,
      activeInterviews: Math.max(activeInterviews, totalInterviews),
      offers,
      savedCount,
      responseRate,
    };
  }, [applications, interviewsMap, savedJobs]);

  // Filtered Applications
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const matchSearch =
        !searchQuery ||
        app.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.location && app.location.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === "all" || app.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [applications, searchQuery, statusFilter]);

  // All Upcoming Interviews Flattened
  const allInterviews = useMemo(() => {
    const list = [];
    applications.forEach((app) => {
      const appInterviews = interviewsMap[app.id] || [];
      appInterviews.forEach((iv) => {
        list.push({
          ...iv,
          companyName: app.companyName,
          jobTitle: app.jobTitle,
        });
      });
    });

    return list.sort((a, b) => new Date(a.scheduledAt || 0) - new Date(b.scheduledAt || 0));
  }, [applications, interviewsMap]);

  if (authLoading) {
    return (
      <div className="auth-viewport">
        <div className="mini-spinner" style={{ width: "32px", height: "32px", borderWidth: "3px" }} />
      </div>
    );
  }

  if (!currentUser) {
    return <AuthView onAuthenticated={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="app-workspace-layout">
      {/* Background ambient lighting */}
      <div className="ambient-glow ambient-glow-1" />
      <div className="ambient-glow ambient-glow-2" />
      <div className="ambient-grid-overlay" />

      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`desktop-sidebar ${sidebarCollapsed ? "collapsed" : ""} ${mobileMenuOpen ? "mobile-open" : ""}`}
      >
        <div className="sidebar-header">
          <a
            href="/"
            className="sidebar-brand-lockup"
            onClick={(e) => {
              e.preventDefault();
              scrollToNav("dashboard");
            }}
          >
            <div className="brand-logo-mark" style={{ width: "30px", height: "30px" }}>
              <span style={{ fontWeight: 800, fontSize: "14px", color: "var(--primary-light)" }}>H</span>
            </div>
            {!sidebarCollapsed && <span className="sidebar-brand-name">HireTrack</span>}
          </a>

          <button
            type="button"
            className="sidebar-collapse-toggle hidden lg:flex"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav-container">
          {!sidebarCollapsed && <span className="nav-section-label">Command Center</span>}

          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === "dashboard" ? "active" : ""}`}
            onClick={() => scrollToNav("dashboard")}
          >
            <span className="nav-item-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="9" rx="1" />
                <rect x="14" y="3" width="7" height="5" rx="1" />
                <rect x="14" y="12" width="7" height="9" rx="1" />
                <rect x="3" y="16" width="7" height="5" rx="1" />
              </svg>
            </span>
            {!sidebarCollapsed && <span>Dashboard</span>}
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === "recommendations" ? "active" : ""}`}
            onClick={() => scrollToNav("recommendations")}
          >
            <span className="nav-item-icon" style={{ color: "var(--accent-purple)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </span>
            {!sidebarCollapsed && <span>AI Job Matches</span>}
            {!sidebarCollapsed && recommendations.length > 0 && (
              <span className="nav-item-badge badge-star">{recommendations.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === "applications" ? "active" : ""}`}
            onClick={() => scrollToNav("applications")}
          >
            <span className="nav-item-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </span>
            {!sidebarCollapsed && <span>Applications</span>}
            {!sidebarCollapsed && (
              <span className="nav-item-badge">{applications.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === "interviews" ? "active" : ""}`}
            onClick={() => scrollToNav("interviews")}
          >
            <span className="nav-item-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            {!sidebarCollapsed && <span>Interviews</span>}
            {!sidebarCollapsed && allInterviews.length > 0 && (
              <span className="nav-item-badge">{allInterviews.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === "resumes" ? "active" : ""}`}
            onClick={() => scrollToNav("resumes")}
          >
            <span className="nav-item-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </span>
            {!sidebarCollapsed && <span>Resumes & CVs</span>}
            {!sidebarCollapsed && (
              <span className="nav-item-badge">{resumes.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === "saved-jobs" ? "active" : ""}`}
            onClick={() => scrollToNav("saved-jobs")}
          >
            <span className="nav-item-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            {!sidebarCollapsed && <span>Saved Jobs</span>}
            {!sidebarCollapsed && savedJobs.length > 0 && (
              <span className="nav-item-badge">{savedJobs.length}</span>
            )}
          </button>
        </nav>

        {/* Sidebar Footer with User Details & Logout */}
        <div className="sidebar-footer">
          <div className="sidebar-user-block">
            <div className="user-avatar-circle">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
            </div>
            {!sidebarCollapsed && (
              <div className="user-text-info">
                <span className="user-display-name">{currentUser.name}</span>
                <span className="user-display-email">{currentUser.email}</span>
              </div>
            )}
          </div>

          <div className="sidebar-action-row">
            <button
              type="button"
              className="btn-sidebar-utility"
              onClick={toggleTheme}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
            >
              {theme === "dark" ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                  {!sidebarCollapsed && <span>Light</span>}
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  {!sidebarCollapsed && <span>Dark</span>}
                </>
              )}
            </button>

            <button
              type="button"
              className="btn-sidebar-utility btn-danger"
              onClick={handleLogout}
              title="Sign out of HireTrack"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main App Content Viewport */}
      <div className="app-main-canvas">
        {/* Top Header Bar */}
        <header className="app-top-header">
          <div className="header-zone-left">
            <button
              type="button"
              className="mobile-menu-trigger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div className="header-breadcrumb-trail">
              <span className="breadcrumb-root">HireTrack OS</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">
                {activeNav === "dashboard"
                  ? "Career Dashboard"
                  : activeNav === "recommendations"
                    ? "AI Job Matches"
                    : activeNav === "applications"
                      ? "Application Workflow"
                      : activeNav === "interviews"
                        ? "Interview Calendar"
                        : activeNav === "resumes"
                          ? "Resumes & CVs"
                          : "Saved Jobs"}
              </span>
            </div>
          </div>

          <div className="header-zone-right">
            <div className="header-search-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search applications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="kbd-shortcut">⌘K</span>
            </div>

            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
            >
              {theme === "dark" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            <button
              type="button"
              className="btn-header-cta"
              onClick={() => {
                setEditingApp(null);
                setAppModalOpen(true);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>+ Track Application</span>
            </button>
          </div>
        </header>

        {/* Workspace Body */}
        <main className="workspace-content-body">
          {/* SECTION 1: DASHBOARD HERO & OVERVIEW */}
          <section id="dashboard-section" className="dashboard-hero-banner">
            <div className="hero-banner-inner">
              <div className="hero-greeting-row">
                <div className="hero-greeting-text">
                  <h1>Good day, {currentUser.name?.split(" ")[0] || "Explorer"}</h1>
                  <p>Here is where your career search pipeline stands today.</p>
                </div>
                <div className="hero-status-pill">
                  <span className="pulse-indicator" />
                  <span>Pipeline Active & Monitoring</span>
                </div>
              </div>

              {/* Progress Pipeline Visualization */}
              <div className="pipeline-bar-container">
                <div className="pipeline-meta-row">
                  <span>Application Funnel Health</span>
                  <span className="tabular-nums">
                    {stats.responseRate}% Response & Progression Rate
                  </span>
                </div>
                <div className="pipeline-track">
                  <div
                    className="pipeline-segment segment-saved"
                    style={{
                      width: `${(applications.filter((a) => a.status === "saved").length / Math.max(stats.totalApps, 1)) * 100}%`,
                    }}
                    title="Saved"
                  />
                  <div
                    className="pipeline-segment segment-applied"
                    style={{
                      width: `${(applications.filter((a) => a.status === "applied").length / Math.max(stats.totalApps, 1)) * 100}%`,
                    }}
                    title="Applied"
                  />
                  <div
                    className="pipeline-segment segment-interviewing"
                    style={{
                      width: `${(applications.filter((a) => a.status === "interviewing").length / Math.max(stats.totalApps, 1)) * 100}%`,
                    }}
                    title="Interviewing"
                  />
                  <div
                    className="pipeline-segment segment-offer"
                    style={{
                      width: `${(applications.filter((a) => a.status === "offer" || a.status === "accepted").length / Math.max(stats.totalApps, 1)) * 100}%`,
                    }}
                    title="Offers"
                  />
                </div>
                <div className="pipeline-legend">
                  <div className="legend-item">
                    <span className="legend-dot segment-saved" />
                    <span>Saved ({applications.filter((a) => a.status === "saved").length})</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot segment-applied" />
                    <span>Applied ({applications.filter((a) => a.status === "applied").length})</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot segment-interviewing" />
                    <span>Interviewing ({applications.filter((a) => a.status === "interviewing").length})</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot segment-offer" />
                    <span>Offers ({applications.filter((a) => a.status === "offer" || a.status === "accepted").length})</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: STATS METRICS GRID */}
          <section className="stats-overview-grid">
            <div className="stat-metric-card">
              <div className="stat-card-header">
                <span className="stat-label-title">Total Tracked</span>
                <div className="stat-icon-badge" style={{ background: "rgba(59, 130, 246, 0.12)", color: "#60a5fa" }}>
                  ▣
                </div>
              </div>
              <div className="stat-value-display tabular-nums">{stats.totalApps}</div>
              <span className="stat-footer-detail">Across all workflow stages</span>
            </div>

            <div className="stat-metric-card">
              <div className="stat-card-header">
                <span className="stat-label-title">Active Interviews</span>
                <div className="stat-icon-badge" style={{ background: "rgba(139, 92, 246, 0.12)", color: "#c084fc" }}>
                  ◷
                </div>
              </div>
              <div className="stat-value-display tabular-nums">{stats.activeInterviews}</div>
              <span className="stat-footer-detail">Scheduled & active rounds</span>
            </div>

            <div className="stat-metric-card">
              <div className="stat-card-header">
                <span className="stat-label-title">Offers & Finalists</span>
                <div className="stat-icon-badge" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#34d399" }}>
                  ★
                </div>
              </div>
              <div className="stat-value-display tabular-nums">{stats.offers}</div>
              <span className="stat-footer-detail">High-probability stages</span>
            </div>

            <div className="stat-metric-card">
              <div className="stat-card-header">
                <span className="stat-label-title">Saved Roles</span>
                <div className="stat-icon-badge" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#fbbf24" }}>
                  ☆
                </div>
              </div>
              <div className="stat-value-display tabular-nums">{stats.savedCount}</div>
              <span className="stat-footer-detail">Bookmarked live postings</span>
            </div>

            <div className="stat-metric-card">
              <div className="stat-card-header">
                <span className="stat-label-title">Conversion Rate</span>
                <div className="stat-icon-badge" style={{ background: "rgba(6, 182, 212, 0.12)", color: "#22d3ee" }}>
                  ↗
                </div>
              </div>
              <div className="stat-value-display tabular-nums">{stats.responseRate}%</div>
              <span className="stat-footer-detail">Applied to response ratio</span>
            </div>
          </section>

          {/* SECTION 3: AI JOB MATCHES (STAR FEATURE) */}
          <section id="recommendations-section" className="ai-recommendations-container">
            <div className="section-hero-header">
              <div className="section-title-lockup">
                <h2>
                  AI Job Matches
                  <span className="ai-sparkle-badge">
                    <span className="pulse-indicator" />
                    Adzuna Live Feed
                  </span>
                </h2>
                <p>Real-time opportunities scored and ranked deterministically against your CV profile.</p>
              </div>

              <button
                type="button"
                className="btn-job-action btn-action-secondary"
                onClick={() => loadRecommendations()}
                disabled={recsLoading}
              >
                ↻ Refresh Live Postings
              </button>
            </div>

            {/* Command Search Interface */}
            <div className="ai-command-search-panel">
              <form
                className="command-search-grid"
                onSubmit={(e) => {
                  e.preventDefault();
                  loadRecommendations();
                }}
              >
                <div className="search-field-unit">
                  <label htmlFor="rec-role-input">What role are you looking for?</label>
                  <div className="search-field-input-box">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      id="rec-role-input"
                      type="text"
                      placeholder="e.g. Software Engineer, React, Fullstack"
                      value={recRole}
                      onChange={(e) => setRecRole(e.target.value)}
                    />
                  </div>
                </div>

                <div className="search-field-unit">
                  <label htmlFor="rec-loc-input">Where?</label>
                  <div className="search-field-input-box">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <input
                      id="rec-loc-input"
                      type="text"
                      placeholder="e.g. Remote, Bengaluru, London"
                      value={recLocation}
                      onChange={(e) => setRecLocation(e.target.value)}
                    />
                  </div>
                </div>

                <div className="search-field-unit">
                  <label htmlFor="rec-cv-select">Match With Resume Profile</label>
                  <div className="search-field-input-box">
                    <select
                      id="rec-cv-select"
                      value={selectedResumeId}
                      onChange={(e) => setSelectedResumeId(e.target.value)}
                    >
                      <option value="">Default Profile</option>
                      {resumes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} {r.isDefault ? "(Default)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button type="submit" className="btn-command-search" disabled={recsLoading}>
                  {recsLoading ? (
                    <span className="btn-spinner-row">
                      <span className="mini-spinner" />
                      <span>Matching...</span>
                    </span>
                  ) : (
                    <>
                      <span>Find Matches</span>
                      <span aria-hidden="true">→</span>
                    </>
                  )}
                </button>
              </form>

              {/* Interactive Quick Filter Chips */}
              <div className="filter-chips-row">
                <span className="filter-chips-label">Popular Searches:</span>
                {["Remote", "Frontend", "Backend", "React", "Node.js", "AI/ML", "Fullstack"].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className={`interactive-chip-btn ${recRole.toLowerCase().includes(chip.toLowerCase()) ? "active" : ""}`}
                    onClick={() => {
                      setRecRole(chip);
                      loadRecommendations(chip, recLocation);
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Recommendations Grid Display */}
            {recsLoading ? (
              <div className="empty-state-card">
                <div className="mini-spinner" style={{ width: "32px", height: "32px", borderWidth: "3px" }} />
                <h3>Scanning Live Adzuna Pipeline</h3>
                <p>Extracting job requirements, parsing skills, and calculating match percentages...</p>
              </div>
            ) : recsError ? (
              <div className="auth-error-banner" style={{ justifyContent: "space-between" }}>
                <span>{recsError}</span>
                <button
                  type="button"
                  className="inline-link-btn"
                  onClick={() => loadRecommendations()}
                >
                  Retry Search
                </button>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="empty-state-card">
                <div className="empty-state-icon">⌕</div>
                <h3>No Matching Live Jobs Found</h3>
                <p>Try searching for a different role keyword or broadening your location query.</p>
                <button
                  type="button"
                  className="btn-job-action btn-action-primary"
                  onClick={() => {
                    setRecRole("Software Engineer");
                    setRecLocation("India");
                    loadRecommendations("Software Engineer", "India");
                  }}
                >
                  Reset to Popular Searches
                </button>
              </div>
            ) : (
              <div className="job-recommendations-grid">
                {recommendations.map((job) => (
                  <RecommendationCard
                    key={job.externalId || job.id}
                    job={job}
                    isSaved={savedJobs.some((s) => s.jobUrl === job.jobUrl)}
                    hasApplied={applications.some((a) => a.jobUrl === job.jobUrl)}
                    onApply={handleApplyFromRecommendation}
                    onToggleSave={handleToggleSaveRecommendation}
                    saving={savingRecId === (job.externalId || job.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* SECTION 4: APPLICATION TRACKER (WORKFLOW & LIST VIEW) */}
          <section id="applications-section" className="applications-workspace">
            <div className="section-hero-header">
              <div className="section-title-lockup">
                <h2>Applications Workspace</h2>
                <p>Manage stages, follow up on pipelines, and advance candidate statuses.</p>
              </div>

              <div className="workspace-controls-bar" style={{ background: "transparent", border: "none", padding: 0 }}>
                {/* View Mode Toggle: Kanban vs List */}
                <div className="view-mode-segmented">
                  <button
                    type="button"
                    className={`segmented-toggle-btn ${viewMode === "kanban" ? "active" : ""}`}
                    onClick={() => setViewMode("kanban")}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="18" rx="1" />
                      <rect x="14" y="3" width="7" height="18" rx="1" />
                    </svg>
                    <span>Workflow Board</span>
                  </button>
                  <button
                    type="button"
                    className={`segmented-toggle-btn ${viewMode === "list" ? "active" : ""}`}
                    onClick={() => setViewMode("list")}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                    <span>Dense List</span>
                  </button>
                </div>
              </div>
            </div>

            {appsLoading ? (
              <div className="empty-state-card">
                <div className="mini-spinner" style={{ width: "28px", height: "28px" }} />
                <p>Loading application pipelines...</p>
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="empty-state-card">
                <div className="empty-state-icon">▣</div>
                <h3>No Applications Tracked Yet</h3>
                <p>Click "+ Track Application" or add matched jobs directly from AI Job Matches above.</p>
                <button
                  type="button"
                  className="btn-job-action btn-action-primary"
                  onClick={() => {
                    setEditingApp(null);
                    setAppModalOpen(true);
                  }}
                >
                  + Add First Application
                </button>
              </div>
            ) : viewMode === "kanban" ? (
              /* KANBAN / WORKFLOW BOARD */
              <div className="kanban-board-canvas">
                {applicationStatuses.slice(0, 6).map((col) => {
                  const colApps = filteredApps.filter((a) => a.status === col.id);
                  return (
                    <div key={col.id} className="kanban-column">
                      <div className="kanban-column-header">
                        <div className="column-title-wrap">
                          <span className="column-color-indicator" style={{ backgroundColor: col.color }} />
                          <span>{col.label}</span>
                        </div>
                        <span className="column-item-count">{colApps.length}</span>
                      </div>

                      <div className="kanban-cards-stack">
                        {colApps.map((app) => {
                          const appInterviews = interviewsMap[app.id] || [];
                          return (
                            <div key={app.id} className="kanban-app-card">
                              <div className="kanban-card-top">
                                <div>
                                  <div className="kanban-card-company">{app.companyName}</div>
                                  <div className="kanban-card-role">{app.jobTitle}</div>
                                </div>
                              </div>

                              <div className="kanban-card-meta">
                                {app.location && <span>📍 {app.location}</span>}
                                {app.appliedAt && <span>📅 Applied {formatDate(app.appliedAt)}</span>}
                                {appInterviews.length > 0 && (
                                  <span style={{ color: "var(--accent-purple)", fontWeight: 600 }}>
                                    ◷ {appInterviews.length} Interview{appInterviews.length > 1 ? "s" : ""}
                                  </span>
                                )}
                              </div>

                              <div className="kanban-card-bottom">
                                <select
                                  className="kanban-status-select"
                                  value={app.status}
                                  onChange={async (e) => {
                                    const newStatus = e.target.value;
                                    try {
                                      await updateApplication(app.id, { status: newStatus });
                                      await loadApplications();
                                      showToast(`Status updated to ${statusMap[newStatus]?.label || newStatus}`);
                                    } catch (err) {
                                      showToast(err.message || "Failed to update status.");
                                    }
                                  }}
                                >
                                  {applicationStatuses.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.label}
                                    </option>
                                  ))}
                                </select>

                                <div className="kanban-action-btns">
                                  {app.jobUrl && (
                                    <a
                                      href={app.jobUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="btn-card-micro"
                                      title="Open original job posting"
                                    >
                                      ↗
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    className="btn-card-micro"
                                    onClick={() => {
                                      setEditingInterviewAppId(app.id);
                                      setEditingInterview(null);
                                      setInterviewModalOpen(true);
                                    }}
                                    title="Add interview"
                                  >
                                    +◷
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-card-micro"
                                    onClick={() => {
                                      setEditingApp(app);
                                      setAppModalOpen(true);
                                    }}
                                    title="Edit application"
                                  >
                                    ✎
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-card-micro"
                                    style={{ color: "#fb7185" }}
                                    onClick={async () => {
                                      if (confirm(`Delete application for ${app.jobTitle} at ${app.companyName}?`)) {
                                        await deleteApplication(app.id);
                                        await loadApplications();
                                        showToast("Application deleted.");
                                      }
                                    }}
                                    title="Delete application"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* DENSE LIST / TABLE VIEW */
              <div className="table-viewport-card">
                <table className="dense-data-table">
                  <thead>
                    <tr>
                      <th>Role & Company</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Applied Date</th>
                      <th>Interviews</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApps.map((app) => {
                      const appInterviews = interviewsMap[app.id] || [];
                      const statusObj = statusMap[app.status] || { label: app.status, color: "#64748b" };
                      return (
                        <tr key={app.id}>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <strong style={{ color: "var(--text-main)" }}>{app.jobTitle}</strong>
                              <span style={{ fontSize: "12px", color: "var(--primary-light)" }}>
                                {app.companyName}
                              </span>
                            </div>
                          </td>
                          <td>{app.location || "Remote"}</td>
                          <td>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                fontSize: "12px",
                                fontWeight: 600,
                                color: statusObj.color,
                              }}
                            >
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  backgroundColor: statusObj.color,
                                }}
                              />
                              {statusObj.label}
                            </span>
                          </td>
                          <td className="tabular-nums">{formatDate(app.appliedAt)}</td>
                          <td>
                            {appInterviews.length > 0 ? (
                              <span style={{ color: "var(--accent-purple)", fontWeight: 600 }}>
                                {appInterviews.length} Round{appInterviews.length > 1 ? "s" : ""}
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-muted)" }}>None scheduled</span>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "6px" }}>
                              {app.jobUrl && (
                                <a
                                  href={app.jobUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn-card-micro"
                                  title="Open job link"
                                >
                                  ↗
                                </a>
                              )}
                              <button
                                type="button"
                                className="btn-card-micro"
                                onClick={() => {
                                  setEditingInterviewAppId(app.id);
                                  setEditingInterview(null);
                                  setInterviewModalOpen(true);
                                }}
                                title="Add interview round"
                              >
                                +◷
                              </button>
                              <button
                                type="button"
                                className="btn-card-micro"
                                onClick={() => {
                                  setEditingApp(app);
                                  setAppModalOpen(true);
                                }}
                              >
                                ✎
                              </button>
                              <button
                                type="button"
                                className="btn-card-micro"
                                style={{ color: "#fb7185" }}
                                onClick={async () => {
                                  if (confirm(`Delete application for ${app.jobTitle}?`)) {
                                    await deleteApplication(app.id);
                                    await loadApplications();
                                    showToast("Application deleted.");
                                  }
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* SECTION 5: INTERVIEW TIMELINE */}
          <section id="interviews-section" className="interviews-workspace">
            <div className="section-hero-header">
              <div className="section-title-lockup">
                <h2>Interview Timeline</h2>
                <p>Track technical screens, rounds, and meeting schedules with countdown precision.</p>
              </div>

              {applications.length > 0 && (
                <button
                  type="button"
                  className="btn-job-action btn-action-primary"
                  onClick={() => {
                    setEditingInterviewAppId(applications[0].id);
                    setEditingInterview(null);
                    setInterviewModalOpen(true);
                  }}
                >
                  + Schedule Interview
                </button>
              )}
            </div>

            {allInterviews.length === 0 ? (
              <div className="empty-state-card">
                <div className="empty-state-icon">◷</div>
                <h3>No Interviews Scheduled</h3>
                <p>Add interview rounds to your active applications to manage meetings and prep notes.</p>
              </div>
            ) : (
              <div className="interview-cards-grid">
                {allInterviews.map((iv) => {
                  const isUpcoming = iv.status === "scheduled" && new Date(iv.scheduledAt || 0) > new Date();
                  return (
                    <div
                      key={iv.id}
                      className={`interview-timeline-card ${isUpcoming ? "is-upcoming" : ""}`}
                    >
                      <div className="interview-card-header">
                        <div>
                          <div className="interview-company-sub">{iv.companyName}</div>
                          <div className="interview-round-name">{iv.roundName}</div>
                        </div>
                        <span
                          className="preview-status-pill"
                          style={{
                            background: iv.status === "scheduled" ? "rgba(99, 102, 241, 0.15)" : "rgba(16, 185, 129, 0.15)",
                            color: iv.status === "scheduled" ? "var(--primary-light)" : "#34d399",
                          }}
                        >
                          {iv.status}
                        </span>
                      </div>

                      <div className="interview-schedule-box">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span className="tabular-nums">
                          {iv.scheduledAt ? formatDateTime(iv.scheduledAt) : "Date to be confirmed"}
                        </span>
                        {iv.durationMinutes && (
                          <span style={{ color: "var(--text-muted)" }}>({iv.durationMinutes} mins)</span>
                        )}
                      </div>

                      <div className="interview-info-list">
                        <div>
                          <strong>Format:</strong> {interviewTypeMap[iv.type] || iv.type}
                        </div>
                        {iv.location && (
                          <div>
                            <strong>Location:</strong> {iv.location}
                          </div>
                        )}
                        {iv.interviewerName && (
                          <div>
                            <strong>Interviewer:</strong> {iv.interviewerName}
                          </div>
                        )}
                        {iv.notes && (
                          <div style={{ marginTop: "4px", color: "var(--text-muted)", fontStyle: "italic" }}>
                            "{iv.notes}"
                          </div>
                        )}
                      </div>

                      <div className="job-card-actions-row">
                        {iv.meetingUrl ? (
                          <a
                            href={iv.meetingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-job-action btn-action-primary"
                          >
                            Join Meeting ↗
                          </a>
                        ) : (
                          <div style={{ flex: 1 }} />
                        )}
                        <button
                          type="button"
                          className="btn-card-micro"
                          style={{ color: "#fb7185" }}
                          onClick={async () => {
                            if (confirm(`Remove this interview round?`)) {
                              await deleteInterview(iv.id);
                              await loadApplications();
                              showToast("Interview removed.");
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* SECTION 6: RESUMES & DOCUMENT WORKSPACE */}
          <section id="resumes-section" className="resumes-workspace">
            <div className="section-hero-header">
              <div className="section-title-lockup">
                <h2>Resumes & Profiles</h2>
                <p>Manage multiple CV versions used for real-time Adzuna deterministic skill matching.</p>
              </div>
            </div>

            {/* Drag & Drop Styled Upload Dropzone */}
            <label className="resume-upload-dropzone">
              <input
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
                    showToast("Only PDF documents are supported.");
                    return;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    showToast("PDF file size must be under 5 MB.");
                    return;
                  }

                  const name = prompt("Name this resume version:", file.name.replace(/\.pdf$/i, "")) || file.name;
                  try {
                    await uploadResume(name, file);
                    await loadResumes();
                    showToast("Resume uploaded successfully.");
                  } catch (err) {
                    showToast(err.message || "Failed to upload resume.");
                  }
                }}
              />
              <div className="dropzone-icon-circle">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <strong style={{ fontSize: "15px", color: "var(--text-main)" }}>
                Click or Drop PDF to Upload New Resume
              </strong>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Supports standard PDF up to 5 MB · Extracted for live job matching
              </span>
            </label>

            {/* Resume Document Cards */}
            <div className="resumes-cards-grid">
              {resumes.map((resume) => (
                <div key={resume.id} className="resume-doc-card">
                  <div className="resume-card-header">
                    <div className="pdf-icon-indicator">PDF</div>
                    <div className="resume-text-meta">
                      <h3>{resume.name}</h3>
                      <span>{resume.originalFilename}</span>
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "var(--text-muted)" }}>
                        {formatDate(resume.createdAt)} · {Math.round(resume.fileSize / 1024)} KB
                      </div>
                    </div>
                  </div>

                  <div className="resume-card-actions">
                    <a
                      href={getResumeDownloadUrl(resume.id)}
                      download={resume.originalFilename}
                      className="btn-job-action btn-action-secondary"
                      style={{ flex: 1 }}
                    >
                      Download PDF
                    </a>

                    {resume.isDefault ? (
                      <span className="preview-status-pill" style={{ color: "#34d399", background: "rgba(16, 185, 129, 0.12)" }}>
                        Default ★
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn-card-micro"
                        onClick={async () => {
                          await updateResume(resume.id, { isDefault: true });
                          await loadResumes();
                          showToast("Default resume updated.");
                        }}
                      >
                        Set Default
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-card-micro"
                      style={{ color: "#fb7185" }}
                      onClick={async () => {
                        if (confirm(`Delete resume ${resume.name}?`)) {
                          await deleteResume(resume.id);
                          await loadResumes();
                          showToast("Resume deleted.");
                        }
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 7: SAVED JOBS WORKSPACE */}
          <section id="saved-jobs-section" className="saved-jobs-workspace">
            <div className="section-hero-header">
              <div className="section-title-lockup">
                <h2>Saved Jobs ({savedJobs.length})</h2>
                <p>Bookmarked opportunities ready to be pushed into active application pipelines.</p>
              </div>
            </div>

            {savedJobs.length === 0 ? (
              <div className="empty-state-card">
                <div className="empty-state-icon">☆</div>
                <h3>No Saved Jobs</h3>
                <p>When you spot interesting roles in AI Job Matches, click "Save" to bookmark them here.</p>
              </div>
            ) : (
              <div className="saved-jobs-grid">
                {savedJobs.map((job) => (
                  <div key={job.id} className="saved-job-box">
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: "12px", color: "var(--primary-light)", fontWeight: 600 }}>
                            {job.companyName}
                          </div>
                          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)", marginTop: "2px" }}>
                            {job.jobTitle}
                          </h3>
                        </div>
                        {job.matchPercentage && (
                          <span className="preview-badge-ai">{job.matchPercentage}% Match</span>
                        )}
                      </div>

                      <div className="job-meta-chips-row" style={{ marginTop: "10px" }}>
                        <span>📍 {job.location || "Remote"}</span>
                        {job.salaryMin && (
                          <span>💰 ₹{job.salaryMin.toLocaleString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="job-card-actions-row">
                      <a
                        href={job.jobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-job-action btn-action-secondary"
                        title="Open exact job URL on Adzuna"
                      >
                        View Job ↗
                      </a>
                      <button
                        type="button"
                        className="btn-job-action btn-action-primary"
                        onClick={() =>
                          handleApplyFromRecommendation({
                            companyName: job.companyName,
                            jobTitle: job.jobTitle,
                            location: job.location,
                            jobUrl: job.jobUrl,
                            matchPercentage: job.matchPercentage,
                          })
                        }
                      >
                        + Add to Tracker
                      </button>
                      <button
                        type="button"
                        className="btn-card-micro"
                        style={{ color: "#fb7185" }}
                        onClick={async () => {
                          await deleteSavedJob(job.id);
                          await loadSavedJobs();
                          showToast("Removed from saved jobs.");
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* APPLICATION CREATE / EDIT MODAL */}
      {appModalOpen && (
        <div className="modal-backdrop-blur" onClick={() => setAppModalOpen(false)}>
          <div className="modal-content-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <h2>{editingApp?.id ? "Edit Application" : "Track New Application"}</h2>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setAppModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form
              className="modal-body-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const payload = {
                  companyName: formData.get("companyName"),
                  jobTitle: formData.get("jobTitle"),
                  location: formData.get("location") || null,
                  jobUrl: formData.get("jobUrl") || null,
                  status: formData.get("status") || "saved",
                  resumeId: formData.get("resumeId") ? Number(formData.get("resumeId")) : null,
                  appliedAt: formData.get("appliedAt") || null,
                  notes: formData.get("notes") || null,
                };

                try {
                  if (editingApp?.id) {
                    await updateApplication(editingApp.id, payload);
                    showToast("Application updated.");
                  } else {
                    await createApplication(payload);
                    showToast("Application created.");
                  }
                  await loadApplications();
                  setAppModalOpen(false);
                } catch (err) {
                  showToast(err.message || "Failed to save application.");
                }
              }}
            >
              <div className="form-input-group">
                <label>Company Name *</label>
                <div className="input-wrapper">
                  <input
                    name="companyName"
                    defaultValue={editingApp?.companyName || ""}
                    placeholder="e.g. Stripe, Linear, Google"
                    required
                  />
                </div>
              </div>

              <div className="form-input-group">
                <label>Job Title / Role *</label>
                <div className="input-wrapper">
                  <input
                    name="jobTitle"
                    defaultValue={editingApp?.jobTitle || ""}
                    placeholder="e.g. Fullstack Engineer"
                    required
                  />
                </div>
              </div>

              <div className="form-input-group">
                <label>Location</label>
                <div className="input-wrapper">
                  <input
                    name="location"
                    defaultValue={editingApp?.location || ""}
                    placeholder="e.g. Remote, Bengaluru, London"
                  />
                </div>
              </div>

              <div className="form-input-group">
                <label>Job Posting URL</label>
                <div className="input-wrapper">
                  <input
                    name="jobUrl"
                    defaultValue={editingApp?.jobUrl || ""}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div className="form-input-group">
                  <label>Status</label>
                  <div className="input-wrapper">
                    <select name="status" defaultValue={editingApp?.status || "applied"}>
                      {applicationStatuses.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-input-group">
                  <label>Applied Date</label>
                  <div className="input-wrapper">
                    <input
                      type="date"
                      name="appliedAt"
                      defaultValue={
                        editingApp?.appliedAt
                          ? String(editingApp.appliedAt).slice(0, 10)
                          : new Date().toISOString().slice(0, 10)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="form-input-group">
                <label>Attached Resume Version</label>
                <div className="input-wrapper">
                  <select name="resumeId" defaultValue={editingApp?.resumeId || ""}>
                    <option value="">No resume attached</option>
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.isDefault ? "(Default)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-input-group">
                <label>Notes & Match Details</label>
                <div className="input-wrapper">
                  <textarea
                    name="notes"
                    rows={3}
                    defaultValue={editingApp?.notes || ""}
                    placeholder="Add interview tips, referral notes, or salary details..."
                  />
                </div>
              </div>

              <div className="modal-actions-footer">
                <button
                  type="button"
                  className="btn-job-action btn-action-secondary"
                  onClick={() => setAppModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-job-action btn-action-primary">
                  {editingApp?.id ? "Save Changes" : "Track Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INTERVIEW CREATE / EDIT MODAL */}
      {interviewModalOpen && (
        <div className="modal-backdrop-blur" onClick={() => setInterviewModalOpen(false)}>
          <div className="modal-content-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <h2>Schedule Interview Round</h2>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setInterviewModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form
              className="modal-body-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const dateVal = formData.get("date");
                const timeVal = formData.get("time");
                let scheduledAt = null;
                if (dateVal && timeVal) {
                  scheduledAt = new Date(`${dateVal}T${timeVal}:00`).toISOString();
                } else if (dateVal) {
                  scheduledAt = new Date(`${dateVal}T10:00:00`).toISOString();
                }

                const payload = {
                  roundName: formData.get("roundName"),
                  type: formData.get("type") || "video",
                  status: formData.get("status") || "scheduled",
                  scheduledAt,
                  durationMinutes: formData.get("durationMinutes")
                    ? Number(formData.get("durationMinutes"))
                    : null,
                  location: formData.get("location") || null,
                  meetingUrl: formData.get("meetingUrl") || null,
                  interviewerName: formData.get("interviewerName") || null,
                  notes: formData.get("notes") || null,
                };

                try {
                  if (editingInterview?.id) {
                    await updateInterview(editingInterview.id, payload);
                    showToast("Interview updated.");
                  } else {
                    await createInterview(editingInterviewAppId, payload);
                    showToast("Interview scheduled.");
                  }
                  await loadApplications();
                  setInterviewModalOpen(false);
                } catch (err) {
                  showToast(err.message || "Failed to schedule interview.");
                }
              }}
            >
              <div className="form-input-group">
                <label>Round Name *</label>
                <div className="input-wrapper">
                  <input
                    name="roundName"
                    defaultValue={editingInterview?.roundName || ""}
                    placeholder="e.g. Technical Screen, System Design, Hiring Manager"
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div className="form-input-group">
                  <label>Type</label>
                  <div className="input-wrapper">
                    <select name="type" defaultValue={editingInterview?.type || "video"}>
                      {interviewTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-input-group">
                  <label>Duration (minutes)</label>
                  <div className="input-wrapper">
                    <input
                      type="number"
                      name="durationMinutes"
                      defaultValue={editingInterview?.durationMinutes || 45}
                      placeholder="45"
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div className="form-input-group">
                  <label>Interview Date</label>
                  <div className="input-wrapper">
                    <input
                      type="date"
                      name="date"
                      defaultValue={
                        editingInterview?.scheduledAt
                          ? String(editingInterview.scheduledAt).slice(0, 10)
                          : new Date().toISOString().slice(0, 10)
                      }
                    />
                  </div>
                </div>

                <div className="form-input-group">
                  <label>Interview Time</label>
                  <div className="input-wrapper">
                    <input
                      type="time"
                      name="time"
                      defaultValue={
                        editingInterview?.scheduledAt
                          ? new Date(editingInterview.scheduledAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })
                          : "14:00"
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="form-input-group">
                <label>Meeting Link (Google Meet, Zoom, Teams)</label>
                <div className="input-wrapper">
                  <input
                    type="url"
                    name="meetingUrl"
                    defaultValue={editingInterview?.meetingUrl || ""}
                    placeholder="https://meet.google.com/..."
                  />
                </div>
              </div>

              <div className="form-input-group">
                <label>Interviewer Name / Role</label>
                <div className="input-wrapper">
                  <input
                    name="interviewerName"
                    defaultValue={editingInterview?.interviewerName || ""}
                    placeholder="e.g. Sarah Chen (VP Engineering)"
                  />
                </div>
              </div>

              <div className="form-input-group">
                <label>Preparation Notes</label>
                <div className="input-wrapper">
                  <textarea
                    name="notes"
                    rows={2}
                    defaultValue={editingInterview?.notes || ""}
                    placeholder="Key topics to review, system design patterns, questions to ask..."
                  />
                </div>
              </div>

              <div className="modal-actions-footer">
                <button
                  type="button"
                  className="btn-job-action btn-action-secondary"
                  onClick={() => setInterviewModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-job-action btn-action-primary">
                  {editingInterview?.id ? "Save Interview" : "Confirm Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="floating-toast-alert" role="status">
          <span style={{ color: "var(--primary-light)" }}>✦</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
