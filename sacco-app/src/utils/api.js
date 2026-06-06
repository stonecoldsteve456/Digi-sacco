import { getCurrentSaccoId, getCurrentUser } from "./financeStore";

const API_BASE = "http://localhost:5000/api";

export function withSacco(path) {
  const saccoId = getCurrentSaccoId();
  const separator = path.includes("?") ? "&" : "?";
  return saccoId ? `${path}${separator}saccoId=${saccoId}` : path;
}

export function getSessionPayload(extra = {}) {
  const user = getCurrentUser();
  return {
    ...extra,
    saccoId: getCurrentSaccoId() || null,
    userEmail: user.email || "",
    createdBy: user.name || user.email || "",
  };
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.error) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}
