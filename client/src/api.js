const TOKEN_KEY = "hiretrack_auth_token";

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

export function setAuthToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (e) {
    // Ignore localStorage errors
  }
}

export function removeAuthToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    // Ignore
  }
}

async function request(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...(options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const body = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/api/auth/login") && !path.startsWith("/api/auth/signup")) {
      removeAuthToken();
      window.dispatchEvent(new CustomEvent("hiretrack:unauthorized"));
    }
    throw new Error(body?.error || `Request failed with status ${response.status}.`);
  }

  return body;
}

// Authentication APIs
export async function signUp({ name, email, password, confirmPassword }) {
  const data = await request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password, confirmPassword }),
  });
  if (data?.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function login({ email, password }) {
  const data = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (data?.token) {
    setAuthToken(data.token);
  }
  return data;
}

export function getCurrentUser() {
  return request("/api/auth/me");
}

export async function logout() {
  try {
    await request("/api/auth/logout", { method: "POST" });
  } finally {
    removeAuthToken();
  }
}

// Applications APIs
export function getApplications() {
  return request("/api/applications");
}

export function createApplication(application) {
  return request("/api/applications", {
    method: "POST",
    body: JSON.stringify(application),
  });
}

export function updateApplication(id, application) {
  return request(`/api/applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify(application),
  });
}

export function deleteApplication(id) {
  return request(`/api/applications/${id}`, {
    method: "DELETE",
  });
}

// Interviews APIs
export function getInterviews(applicationId) {
  return request(`/api/applications/${applicationId}/interviews`);
}

export function createInterview(applicationId, interview) {
  return request(`/api/applications/${applicationId}/interviews`, {
    method: "POST",
    body: JSON.stringify(interview),
  });
}

export function updateInterview(id, interview) {
  return request(`/api/interviews/${id}`, {
    method: "PATCH",
    body: JSON.stringify(interview),
  });
}

export function deleteInterview(id) {
  return request(`/api/interviews/${id}`, {
    method: "DELETE",
  });
}

// Resumes APIs
export function getResumes() {
  return request("/api/resumes");
}

export function uploadResume(name, file) {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("file", file);
  return request("/api/resumes", {
    method: "POST",
    headers: {},
    body: formData,
  });
}

export function updateResume(id, resume) {
  return request(`/api/resumes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(resume),
  });
}

export function deleteResume(id) {
  return request(`/api/resumes/${id}`, {
    method: "DELETE",
  });
}

export function getResumeDownloadUrl(id) {
  const token = getAuthToken();
  return `/api/resumes/${id}/download${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}

// Job Recommendations & Saved Jobs APIs
export function getJobRecommendations(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.what) searchParams.set("what", params.what);
  if (params.where) searchParams.set("where", params.where);
  if (params.resumeId) searchParams.set("resumeId", params.resumeId);
  if (params.country) searchParams.set("country", params.country);

  const query = searchParams.toString();
  return request(`/api/jobs/recommendations${query ? `?${query}` : ""}`);
}

export function getSavedJobs() {
  return request("/api/saved-jobs");
}

export function saveJob(job) {
  return request("/api/saved-jobs", {
    method: "POST",
    body: JSON.stringify(job),
  });
}

export function deleteSavedJob(id) {
  return request(`/api/saved-jobs/${id}`, {
    method: "DELETE",
  });
}
