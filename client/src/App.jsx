import { useCallback, useEffect, useState } from "react";
import {
  createApplication,
  deleteApplication,
  getApplications,
  updateApplication,
} from "./api";
import "./index.css";

const statuses = [
  ["saved", "Saved"],
  ["applied", "Applied"],
  ["interviewing", "Interviewing"],
  ["offer", "Offer"],
  ["accepted", "Accepted"],
  ["rejected", "Rejected"],
  ["withdrawn", "Withdrawn"],
];

const statusLabels = Object.fromEntries(statuses);

const emptyForm = {
  companyName: "",
  jobTitle: "",
  location: "",
  jobUrl: "",
  status: "saved",
  appliedAt: "",
  notes: "",
};

function formatDate(value) {
  if (!value) {
    return "No date added";
  }

  const dateValue = String(value).includes("T") ? value : `${value}T00:00:00Z`;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(dateValue));
}

function StatusBadge({ status }) {
  return <span className={`status-badge status-${status}`}>{statusLabels[status] || status}</span>;
}

function ApplicationForm({ application, saving, onCancel, onSubmit }) {
  const [form, setForm] = useState(application || emptyForm);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(form);
  }

  const editing = Boolean(application?.id);

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="application-form-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{editing ? "Update record" : "New record"}</p>
            <h2 id="application-form-title">
              {editing ? "Edit application" : "Add application"}
            </h2>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="Close form">
            ×
          </button>
        </div>

        <form className="application-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Company Name <span>*</span>
              <input
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
                placeholder="e.g. Linear"
                required
                autoFocus
              />
            </label>
            <label>
              Job Title <span>*</span>
              <input
                name="jobTitle"
                value={form.jobTitle}
                onChange={handleChange}
                placeholder="e.g. Product Designer"
                required
              />
            </label>
            <label>
              Location
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g. Remote"
              />
            </label>
            <label>
              Job URL
              <input
                type="url"
                name="jobUrl"
                value={form.jobUrl}
                onChange={handleChange}
                placeholder="https://..."
              />
            </label>
            <label>
              Status
              <select name="status" value={form.status} onChange={handleChange}>
                {statuses.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Applied Date
              <input type="date" name="appliedAt" value={form.appliedAt || ""} onChange={handleChange} />
            </label>
          </div>
          <label>
            Notes
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Add context you want to remember..."
              rows="4"
            />
          </label>
          <div className="form-actions">
            <button className="button button-secondary" type="button" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save changes" : "Add application"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ApplicationCard({ application, onEdit, onDelete, deleting }) {
  return (
    <article className="application-card">
      <div className="card-topline">
        <div>
          <p className="company-name">{application.companyName}</p>
          <h3>{application.jobTitle}</h3>
        </div>
        <StatusBadge status={application.status} />
      </div>

      <div className="application-meta">
        <span>{application.location || "Location not set"}</span>
        <span>{application.appliedAt ? `Applied ${formatDate(application.appliedAt)}` : "Date not set"}</span>
      </div>

      {application.notes && <p className="application-notes">{application.notes}</p>}

      <div className="card-actions">
        {application.jobUrl && (
          <a href={application.jobUrl} target="_blank" rel="noreferrer">
            View job
          </a>
        )}
        <span className="action-spacer" />
        <button className="text-button" type="button" onClick={() => onEdit(application)}>
          Edit
        </button>
        <button
          className="text-button text-button-danger"
          type="button"
          onClick={() => onDelete(application)}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </article>
  );
}

export default function App() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setApplications(await getApplications());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  function openAddForm() {
    setEditingApplication(null);
    setFormOpen(true);
  }

  function openEditForm(application) {
    setEditingApplication({
      ...application,
      appliedAt: application.appliedAt ? String(application.appliedAt).slice(0, 10) : "",
    });
    setFormOpen(true);
  }

  async function handleSave(form) {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editingApplication) {
        await updateApplication(editingApplication.id, form);
        setMessage("Application updated successfully.");
      } else {
        await createApplication(form);
        setMessage("Application added successfully.");
      }
      setFormOpen(false);
      setEditingApplication(null);
      await loadApplications();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(application) {
    if (!window.confirm(`Delete the ${application.jobTitle} application at ${application.companyName}?`)) {
      return;
    }

    setDeletingId(application.id);
    setError("");
    setMessage("");

    try {
      await deleteApplication(application.id);
      setMessage("Application deleted successfully.");
      await loadApplications();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingId(null);
    }
  }

  const countFor = (status) => applications.filter((application) => application.status === status).length;

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="/">
          <span className="brand-mark">H</span>
          <span>HireTrack</span>
        </a>
        <div className="header-context">
          <span className="live-dot" />
          Personal workspace
        </div>
      </header>

      <main className="dashboard">
        <div className="dashboard-intro">
          <div>
            <p className="eyebrow">Your job search, organized</p>
            <h1>Applications</h1>
            <p className="intro-copy">Keep every opportunity moving forward.</p>
          </div>
          <button className="button button-primary add-button" type="button" onClick={openAddForm}>
            <span aria-hidden="true">+</span>
            Add application
          </button>
        </div>

        <section className="summary-grid" aria-label="Application summary">
          <div className="summary-card summary-card-total">
            <span className="summary-label">Total applications</span>
            <strong>{loading ? "—" : applications.length}</strong>
            <span className="summary-detail">Across your current search</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Applied</span>
            <strong>{loading ? "—" : countFor("applied")}</strong>
            <span className="summary-detail">Applications submitted</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Interviewing</span>
            <strong>{loading ? "—" : countFor("interviewing")}</strong>
            <span className="summary-detail">Active conversations</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Offers</span>
            <strong>{loading ? "—" : countFor("offer")}</strong>
            <span className="summary-detail">Offers received</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Rejected</span>
            <strong>{loading ? "—" : countFor("rejected")}</strong>
            <span className="summary-detail">Closed applications</span>
          </div>
        </section>

        {message && (
          <div className="feedback feedback-success" role="status">
            <span aria-hidden="true">✓</span>
            {message}
          </div>
        )}
        {error && (
          <div className="feedback feedback-error" role="alert">
            <span>{error}</span>
            <button className="text-button" type="button" onClick={loadApplications}>
              Retry
            </button>
          </div>
        )}

        <section className="applications-section">
          <div className="section-heading">
            <div>
              <h2>All applications</h2>
              <p>Most recently updated first</p>
            </div>
            <button className="refresh-button" type="button" onClick={loadApplications} disabled={loading}>
              <span aria-hidden="true">↻</span>
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="empty-state">
              <div className="loading-spinner" />
              <h3>Loading your applications</h3>
              <p>Fetching the latest updates.</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">＋</div>
              <h3>Your pipeline is clear</h3>
              <p>Add your first application to start tracking your search.</p>
              <button className="button button-primary" type="button" onClick={openAddForm}>
                Add your first application
              </button>
            </div>
          ) : (
            <div className="applications-list">
              {applications.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  onEdit={openEditForm}
                  onDelete={handleDelete}
                  deleting={deletingId === application.id}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {formOpen && (
        <ApplicationForm
          application={editingApplication}
          saving={saving}
          onCancel={() => setFormOpen(false)}
          onSubmit={handleSave}
        />
      )}
    </div>
  );
}