import { useCallback, useEffect, useState } from "react";
import {
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

const interviewStatuses = [
  ["scheduled", "Scheduled"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
  ["rescheduled", "Rescheduled"],
];

const interviewTypes = [
  ["phone", "Phone"],
  ["video", "Video"],
  ["onsite", "Onsite"],
  ["take_home", "Take-home"],
  ["other", "Other"],
];

const interviewStatusLabels = Object.fromEntries(interviewStatuses);
const interviewTypeLabels = Object.fromEntries(interviewTypes);

const emptyForm = {
  companyName: "",
  jobTitle: "",
  location: "",
  jobUrl: "",
  status: "saved",
  appliedAt: "",
  resumeId: "",
  notes: "",
};

const emptyInterviewForm = {
  roundName: "",
  type: "video",
  status: "scheduled",
  date: "",
  time: "",
  durationMinutes: "",
  location: "",
  meetingUrl: "",
  interviewerName: "",
  interviewerEmail: "",
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

function formatDateTime(value) {
  if (!value) {
    return "Date and time not set";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function interviewFormFromRecord(interview) {
  if (!interview) {
    return { ...emptyInterviewForm };
  }

  const scheduledDate = interview.scheduledAt
    ? new Date(interview.scheduledAt)
    : null;
  const hasScheduledDate =
    scheduledDate && !Number.isNaN(scheduledDate.getTime());
  const pad = (value) => String(value).padStart(2, "0");
  return {
    roundName: interview.roundName || "",
    type: interview.type || "other",
    status: interview.status || "scheduled",
    date: hasScheduledDate
      ? `${scheduledDate.getFullYear()}-${pad(scheduledDate.getMonth() + 1)}-${pad(scheduledDate.getDate())}`
      : "",
    time: hasScheduledDate
      ? `${pad(scheduledDate.getHours())}:${pad(scheduledDate.getMinutes())}`
      : "",
    durationMinutes: interview.durationMinutes ?? "",
    location: interview.location || "",
    meetingUrl: interview.meetingUrl || "",
    interviewerName: interview.interviewerName || "",
    interviewerEmail: interview.interviewerEmail || "",
    notes: interview.notes || "",
  };
}

function interviewPayloadFromForm(form) {
  const scheduledDate =
    form.date && form.time ? new Date(`${form.date}T${form.time}`) : null;
  return {
    roundName: form.roundName,
    type: form.type,
    status: form.status,
    scheduledAt:
      scheduledDate && !Number.isNaN(scheduledDate.getTime())
        ? scheduledDate.toISOString()
        : null,
    durationMinutes:
      form.durationMinutes === "" ? null : Number(form.durationMinutes),
    location: form.location,
    meetingUrl: form.meetingUrl,
    interviewerName: form.interviewerName,
    interviewerEmail: form.interviewerEmail,
    notes: form.notes,
  };
}

function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-${status}`}>
      {statusLabels[status] || status}
    </span>
  );
}

function InterviewForm({ interview, saving, onCancel, onSubmit }) {
  const [form, setForm] = useState(() => interviewFormFromRecord(interview));
  const [formError, setFormError] = useState("");
  const editing = Boolean(interview?.id);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (Boolean(form.date) !== Boolean(form.time)) {
      setFormError("Enter both a date and time, or leave both blank.");
      return;
    }

    setFormError("");
    onSubmit(interviewPayloadFromForm(form));
  }

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="interview-form-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">
              {editing ? "Update interview" : "New interview"}
            </p>
            <h2 id="interview-form-title">
              {editing ? "Edit interview" : "Add interview"}
            </h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onCancel}
            aria-label="Close form"
          >
            ×
          </button>
        </div>

        <form
          className="application-form interview-form"
          onSubmit={handleSubmit}
        >
          <div className="form-grid">
            <label>
              Round Name <span>*</span>
              <input
                name="roundName"
                value={form.roundName}
                onChange={handleChange}
                placeholder="e.g. Hiring manager"
                required
                autoFocus
              />
            </label>
            <label>
              Interview Type
              <select name="type" value={form.type} onChange={handleChange}>
                {interviewTypes.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select name="status" value={form.status} onChange={handleChange}>
                {interviewStatuses.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Duration
              <div className="input-with-suffix">
                <input
                  type="number"
                  name="durationMinutes"
                  value={form.durationMinutes}
                  onChange={handleChange}
                  min="0"
                  max="1440"
                  placeholder="45"
                />
                <span>min</span>
              </div>
            </label>
            <label>
              Date
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
              />
            </label>
            <label>
              Time
              <input
                type="time"
                name="time"
                value={form.time}
                onChange={handleChange}
              />
            </label>
            <label>
              Location
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g. Google Meet"
              />
            </label>
            <label>
              Meeting URL
              <input
                type="url"
                name="meetingUrl"
                value={form.meetingUrl}
                onChange={handleChange}
                placeholder="https://..."
              />
            </label>
            <label>
              Interviewer Name
              <input
                name="interviewerName"
                value={form.interviewerName}
                onChange={handleChange}
                placeholder="e.g. Alex Morgan"
              />
            </label>
            <label>
              Interviewer Email
              <input
                type="email"
                name="interviewerEmail"
                value={form.interviewerEmail}
                onChange={handleChange}
                placeholder="alex@company.com"
              />
            </label>
          </div>
          <label>
            Notes
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Capture preparation notes or follow-ups..."
              rows="4"
            />
          </label>
          {formError && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}
          <div className="form-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="button button-primary"
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editing
                  ? "Save changes"
                  : "Add interview"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function InterviewCard({ interview, onEdit, onDelete, deleting }) {
  return (
    <article className="interview-card">
      <div className="interview-card-heading">
        <div>
          <p className="interview-round">{interview.roundName}</p>
          <p className="interview-type">
            {interviewTypeLabels[interview.type] || interview.type}
          </p>
        </div>
        <span
          className={`interview-status interview-status-${interview.status}`}
        >
          {interviewStatusLabels[interview.status] || interview.status}
        </span>
      </div>
      <div className="interview-meta">
        <span>{formatDateTime(interview.scheduledAt)}</span>
        {interview.durationMinutes !== null &&
          interview.durationMinutes !== undefined && (
            <span>{interview.durationMinutes} min</span>
          )}
        {interview.interviewerName && <span>{interview.interviewerName}</span>}
      </div>
      <div className="interview-details">
        {interview.location && <span>{interview.location}</span>}
        {interview.meetingUrl && (
          <a href={interview.meetingUrl} target="_blank" rel="noreferrer">
            Open meeting link
          </a>
        )}
      </div>
      {interview.notes && <p className="interview-notes">{interview.notes}</p>}
      <div className="interview-actions">
        <button
          className="text-button"
          type="button"
          onClick={() => onEdit(interview)}
        >
          Edit
        </button>
        <button
          className="text-button text-button-danger"
          type="button"
          onClick={() => onDelete(interview)}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </article>
  );
}

function InterviewSection({ applicationId, onNotify }) {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingInterview, setEditingInterview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadInterviews = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setInterviews(await getInterviews(applicationId));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    loadInterviews();
  }, [loadInterviews]);

  function openAddForm() {
    setEditingInterview(null);
    setFormOpen(true);
  }

  function openEditForm(interview) {
    setEditingInterview(interview);
    setFormOpen(true);
  }

  async function handleSave(interview) {
    setSaving(true);
    setError("");

    try {
      if (editingInterview) {
        await updateInterview(editingInterview.id, interview);
        onNotify("Interview updated successfully.");
      } else {
        await createInterview(applicationId, interview);
        onNotify("Interview added successfully.");
      }
      setFormOpen(false);
      setEditingInterview(null);
      await loadInterviews();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(interview) {
    if (!window.confirm(`Delete the ${interview.roundName} interview?`)) {
      return;
    }

    setDeletingId(interview.id);
    setError("");

    try {
      await deleteInterview(interview.id);
      onNotify("Interview deleted successfully.");
      await loadInterviews();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="interview-section" aria-label="Interviews">
      <div className="interview-section-heading">
        <div>
          <h4>Interviews</h4>
          <span>
            {loading
              ? "Loading..."
              : `${interviews.length} ${interviews.length === 1 ? "round" : "rounds"}`}
          </span>
        </div>
        <button
          className="interview-add-button"
          type="button"
          onClick={openAddForm}
        >
          <span aria-hidden="true">+</span>
          Add interview
        </button>
      </div>

      {error && (
        <div className="interview-error" role="alert">
          <span>{error}</span>
          <button
            className="text-button"
            type="button"
            onClick={loadInterviews}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <p className="interview-empty">Loading interview rounds...</p>
      ) : interviews.length === 0 ? (
        <p className="interview-empty">No interview rounds recorded yet.</p>
      ) : (
        <div className="interview-list">
          {interviews.map((interview) => (
            <InterviewCard
              key={interview.id}
              interview={interview}
              onEdit={openEditForm}
              onDelete={handleDelete}
              deleting={deletingId === interview.id}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <InterviewForm
          interview={editingInterview}
          saving={saving}
          onCancel={() => setFormOpen(false)}
          onSubmit={handleSave}
        />
      )}
    </section>
  );
}

function formatFileSize(value) {
  if (!value) {
    return "0 KB";
  }
  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function ResumeForm({ resume, saving, onCancel, onSubmit }) {
  const [name, setName] = useState(resume?.name || "");
  const [file, setFile] = useState(null);
  const [formError, setFormError] = useState("");
  const editing = Boolean(resume?.id);

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Enter a name for this resume.");
      return;
    }
    if (!editing && !file) {
      setFormError("Choose a PDF resume to upload.");
      return;
    }
    if (!editing && file.type !== "application/pdf") {
      setFormError("Only PDF resumes are accepted.");
      return;
    }
    setFormError("");
    onSubmit({ name: trimmedName, file });
  }

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <section
        className="modal resume-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-form-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{editing ? "Update resume" : "New resume"}</p>
            <h2 id="resume-form-title">
              {editing ? "Rename resume" : "Upload resume"}
            </h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onCancel}
            aria-label="Close form"
          >
            ×
          </button>
        </div>

        <form className="application-form" onSubmit={handleSubmit}>
          <label>
            Resume Name <span>*</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Product design resume"
              maxLength="120"
              required
              autoFocus
            />
          </label>
          {!editing && (
            <label>
              PDF File <span>*</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                required
              />
              <small className="field-help">PDF only, up to 5 MB.</small>
            </label>
          )}
          {formError && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}
          <div className="form-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="button button-primary"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving..." : editing ? "Save name" : "Upload resume"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ResumeCard({
  resume,
  onEdit,
  onSetDefault,
  onDelete,
  deleting,
}) {
  return (
    <article className="resume-card">
      <div className="resume-card-main">
        <div className="resume-file-icon" aria-hidden="true">
          PDF
        </div>
        <div className="resume-card-copy">
          <div className="resume-title-row">
            <h3>{resume.name}</h3>
            {resume.isDefault && <span className="default-badge">Default</span>}
          </div>
          <p>
            {resume.originalFilename} · {formatFileSize(resume.fileSize)}
          </p>
          <span>Uploaded {formatDateTime(resume.createdAt)}</span>
        </div>
      </div>
      <div className="resume-actions">
        <a
          className="text-button"
          href={getResumeDownloadUrl(resume.id)}
          target="_blank"
          rel="noreferrer"
        >
          Download
        </a>
        <button
          className="text-button"
          type="button"
          onClick={() => onSetDefault(resume)}
        >
          {resume.isDefault ? "Unset default" : "Set default"}
        </button>
        <button className="text-button" type="button" onClick={() => onEdit(resume)}>
          Rename
        </button>
        <button
          className="text-button text-button-danger"
          type="button"
          onClick={() => onDelete(resume)}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </article>
  );
}

function ResumeManager({
  resumes,
  loading,
  error,
  onReload,
  onNotify,
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingResume, setEditingResume] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [actionError, setActionError] = useState("");

  function openUploadForm() {
    setEditingResume(null);
    setActionError("");
    setFormOpen(true);
  }

  function openRenameForm(resume) {
    setEditingResume(resume);
    setActionError("");
    setFormOpen(true);
  }

  async function handleSave(values) {
    setSaving(true);
    setActionError("");
    try {
      if (editingResume) {
        await updateResume(editingResume.id, { name: values.name });
        onNotify("Resume renamed successfully.");
      } else {
        await uploadResume(values.name, values.file);
        onNotify("Resume uploaded successfully.");
      }
      setFormOpen(false);
      setEditingResume(null);
      await onReload();
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(resume) {
    setActionError("");
    try {
      await updateResume(resume.id, { isDefault: !resume.isDefault });
      onNotify(resume.isDefault ? "Default resume unset." : "Default resume updated.");
      await onReload();
    } catch (requestError) {
      setActionError(requestError.message);
    }
  }

  async function handleDelete(resume) {
    if (!window.confirm(`Delete the ${resume.name} resume?`)) {
      return;
    }

    setDeletingId(resume.id);
    setActionError("");
    try {
      await deleteResume(resume.id);
      onNotify("Resume deleted successfully.");
      await onReload();
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setDeletingId(null);
    }
  }

  const visibleError = actionError || error;
  return (
    <section className="resumes-section" aria-labelledby="resumes-title">
      <div className="section-heading">
        <div>
          <h2 id="resumes-title">Resumes</h2>
          <p>Keep tailored versions ready for every opportunity.</p>
        </div>
        <button
          className="button button-secondary resume-upload-button"
          type="button"
          onClick={openUploadForm}
        >
          <span aria-hidden="true">+</span>
          Upload resume
        </button>
      </div>

      {visibleError && (
        <div className="feedback feedback-error resume-feedback" role="alert">
          <span>{visibleError}</span>
          <button className="text-button" type="button" onClick={onReload}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="resume-empty">
          <div className="loading-spinner" />
          <p>Loading your resumes...</p>
        </div>
      ) : resumes.length === 0 ? (
        <div className="resume-empty">
          <div className="empty-icon">▤</div>
          <h3>No resumes uploaded yet</h3>
          <p>Upload a PDF to reuse it across your applications.</p>
          <button className="button button-secondary" type="button" onClick={openUploadForm}>
            Upload your first resume
          </button>
        </div>
      ) : (
        <div className="resume-list">
          {resumes.map((resume) => (
            <ResumeCard
              key={resume.id}
              resume={resume}
              onEdit={openRenameForm}
              onSetDefault={handleSetDefault}
              onDelete={handleDelete}
              deleting={deletingId === resume.id}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <ResumeForm
          resume={editingResume}
          saving={saving}
          onCancel={() => setFormOpen(false)}
          onSubmit={handleSave}
        />
      )}
    </section>
  );
}

function ApplicationForm({
  application,
  resumes,
  saving,
  onCancel,
  onSubmit,
}) {
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
            <p className="eyebrow">
              {editing ? "Update record" : "New record"}
            </p>
            <h2 id="application-form-title">
              {editing ? "Edit application" : "Add application"}
            </h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onCancel}
            aria-label="Close form"
          >
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
              <input
                type="date"
                name="appliedAt"
                value={form.appliedAt || ""}
                onChange={handleChange}
              />
            </label>
            <label>
              Resume used
              <select
                name="resumeId"
                value={form.resumeId || ""}
                onChange={handleChange}
              >
                <option value="">No resume selected</option>
                {resumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.name}
                    {resume.isDefault ? " (Default)" : ""}
                  </option>
                ))}
              </select>
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
            <button
              className="button button-secondary"
              type="button"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="button button-primary"
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editing
                  ? "Save changes"
                  : "Add application"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ApplicationCard({
  application,
  onEdit,
  onDelete,
  deleting,
  onNotify,
}) {
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
        <span>
          {application.appliedAt
            ? `Applied ${formatDate(application.appliedAt)}`
            : "Date not set"}
        </span>
      </div>

      {application.notes && (
        <p className="application-notes">{application.notes}</p>
      )}

      <div className="card-actions">
        {application.jobUrl && (
          <a href={application.jobUrl} target="_blank" rel="noreferrer">
            View job
          </a>
        )}
        <span className="action-spacer" />
        <button
          className="text-button"
          type="button"
          onClick={() => onEdit(application)}
        >
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

      <InterviewSection applicationId={application.id} onNotify={onNotify} />
    </article>
  );
}

export default function App() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resumes, setResumes] = useState([]);
  const [resumesLoading, setResumesLoading] = useState(true);
  const [resumesError, setResumesError] = useState("");
  const [message, setMessage] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState("");

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

  const loadResumes = useCallback(async () => {
    setResumesLoading(true);
    setResumesError("");

    try {
      setResumes(await getResumes());
    } catch (requestError) {
      setResumesError(requestError.message);
    } finally {
      setResumesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
    loadResumes();
  }, [loadApplications, loadResumes]);

  function showToast(nextMessage) {
    setToast(nextMessage);
    window.setTimeout(() => setToast(""), 3200);
  }

  function openAddForm() {
    setEditingApplication(null);
    setFormOpen(true);
  }

  function openEditForm(application) {
    setEditingApplication({
      id: application.id,
      companyName: application.companyName || "",
      jobTitle: application.jobTitle || "",
      location: application.location || "",
      jobUrl: application.jobUrl || "",
      status: application.status || "saved",
      resumeId: application.resumeId ?? "",
      appliedAt: application.appliedAt
        ? String(application.appliedAt).slice(0, 10)
        : "",
      notes: application.notes || "",
    });

    setFormOpen(true);
  }

  async function handleSave(form) {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editingApplication) {
        const {
          companyName,
          jobTitle,
          location,
          jobUrl,
          status,
          resumeId,
          appliedAt,
          notes,
        } = form;

        await updateApplication(editingApplication.id, {
          companyName,
          jobTitle,
          location,
          jobUrl,
          status,
          resumeId: resumeId || null,
          appliedAt,
          notes,
        });

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
    if (
      !window.confirm(
        `Delete the ${application.jobTitle} application at ${application.companyName}?`,
      )
    ) {
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

  const countFor = (status) =>
    applications.filter((application) => application.status === status).length;

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
          <button
            className="button button-primary add-button"
            type="button"
            onClick={openAddForm}
          >
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

        <ResumeManager
          resumes={resumes}
          loading={resumesLoading}
          error={resumesError}
          onReload={loadResumes}
          onNotify={showToast}
        />

        {message && (
          <div className="feedback feedback-success" role="status">
            <span aria-hidden="true">✓</span>
            {message}
          </div>
        )}
        {error && (
          <div className="feedback feedback-error" role="alert">
            <span>{error}</span>
            <button
              className="text-button"
              type="button"
              onClick={loadApplications}
            >
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
            <button
              className="refresh-button"
              type="button"
              onClick={loadApplications}
              disabled={loading}
            >
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
              <button
                className="button button-primary"
                type="button"
                onClick={openAddForm}
              >
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
                  onNotify={showToast}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {formOpen && (
        <ApplicationForm
          application={editingApplication}
          resumes={resumes}
          saving={saving}
          onCancel={() => setFormOpen(false)}
          onSubmit={handleSave}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <span aria-hidden="true">✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}
