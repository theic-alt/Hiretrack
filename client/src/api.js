async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const body = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.error || `Request failed with status ${response.status}.`);
  }

  return body;
}

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