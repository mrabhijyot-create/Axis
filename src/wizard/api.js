// Thin fetch wrapper for the visa-wizard-server API. In dev, Vite proxies
// /api to the backend (see vite.config.js) so this can just use relative
// paths regardless of which port the backend actually runs on.

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options,
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;
  if (!res.ok && res.status !== 202) {
    throw new Error(data?.error || `Request to ${path} failed (${res.status})`);
  }
  return data;
}

export const api = {
  ds160Mapping: () => request("/ds160-mapping"),
  locations: () => request("/locations"),
  createSession: () => request("/session", { method: "POST" }),
  getSession: (id) => request(`/session/${id}`),
  saveProfile: (id, profile) => request(`/session/${id}/profile`, { method: "PATCH", body: JSON.stringify(profile) }),

  uploadDocument: (id, file) => {
    const form = new FormData();
    form.append("file", file);
    return request(`/session/${id}/documents`, { method: "POST", body: form });
  },

  startDs160: (id, mode = "mock") => request(`/session/${id}/ds160/start`, { method: "POST", body: JSON.stringify({ mode }) }),
  ds160Status: (id) => request(`/session/${id}/ds160/status`),
  resumeDs160: (id) => request(`/session/${id}/ds160/resume`, { method: "POST" }),
  closeDs160: (id) => request(`/session/${id}/ds160/close`, { method: "POST" }),

  startWatcher: (id, body) => request(`/session/${id}/watcher/start`, { method: "POST", body: JSON.stringify(body) }),
  stopWatcher: (id) => request(`/session/${id}/watcher/stop`, { method: "POST" }),
  watcherStatus: (id) => request(`/session/${id}/watcher/status`),
  testAlert: (id, body) => request(`/session/${id}/watcher/test-alert`, { method: "POST", body: JSON.stringify(body) }),
};
