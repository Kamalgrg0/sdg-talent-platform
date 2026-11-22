/**
 * Thin fetch wrapper for the Django REST API.
 *
 * - Relative /api URLs work both through the Vite dev proxy and when Django
 *   serves the built SPA from the same origin.
 * - Session cookies are always sent.
 * - Every unsafe request carries the Django CSRF token.
 */

import { firstErrorText } from "./errorText.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);

export class ApiError extends Error {
  constructor(message, status, errors = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

function getCookie(name) {
  const prefix = `${name}=`;
  const parts = document.cookie ? document.cookie.split(";") : [];
  for (const part of parts) {
    const value = part.trim();
    if (value.startsWith(prefix)) {
      return decodeURIComponent(value.slice(prefix.length));
    }
  }
  return null;
}

const OFFLINE_MESSAGE = "Unable to connect to the server. Check that the Django backend is running.";

async function fetchCsrf() {
  let response;
  try {
    response = await fetch("/api/auth/csrf/", {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new ApiError(OFFLINE_MESSAGE, 0);
  }
  if (!response.ok) {
    throw new ApiError("Unable to initialize your secure session. Please refresh and try again.", response.status);
  }
}

async function parseBody(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toError(response, payload) {
  const message = firstErrorText(
    payload && typeof payload === "object" && "detail" in payload ? payload.detail : payload,
    `Request failed (${response.status}).`
  );
  let errors = null;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    if (payload.errors && typeof payload.errors === "object") {
      errors = payload.errors;
    } else if (!("detail" in payload) && Object.keys(payload).length > 0) {
      // Compatible with standard DRF responses that place errors at top level.
      errors = payload;
    }
  }
  return new ApiError(message, response.status, errors);
}

async function send(path, { method = "GET", body, signal } = {}) {
  const options = {
    method,
    credentials: "include",
    headers: { Accept: "application/json" },
    signal,
  };

  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  if (!SAFE_METHODS.has(method)) {
    const token = getCookie("csrftoken");
    if (token) options.headers["X-CSRFToken"] = token;
  }

  try {
    return await fetch(path, options);
  } catch {
    throw new ApiError(OFFLINE_MESSAGE, 0);
  }
}

export async function request(path, options = {}) {
  await ensureCsrf();
  let response = await send(path, options);

  // The CSRF cookie may have expired even though the session is valid. Refresh
  // it once and retry the unsafe request before surfacing an error.
  if (response.status === 403 && !SAFE_METHODS.has(options.method || "GET")) {
    await fetchCsrf();
    response = await send(path, options);
  }

  const payload = await parseBody(response);
  if (!response.ok) throw toError(response, payload);
  return payload;
}

let csrfReady = null;

export function ensureCsrf() {
  if (getCookie("csrftoken")) return Promise.resolve();
  if (!csrfReady) {
    csrfReady = fetchCsrf().finally(() => {
      // Allow a later retry if the first attempt did not set a cookie.
      if (!getCookie("csrftoken")) csrfReady = null;
    });
  }
  return csrfReady;
}

export function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === false) return;
    if (Array.isArray(value)) {
      if (value.length === 0) return;
      search.set(key, value.join(","));
    } else {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const api = {
  get(path, params) {
    return request(`${path}${buildQuery(params)}`);
  },
  post(path, body) {
    return request(path, { method: "POST", body: body ?? {} });
  },
  put(path, body) {
    return request(path, { method: "PUT", body: body ?? {} });
  },
  patch(path, body) {
    return request(path, { method: "PATCH", body: body ?? {} });
  },
  delete(path) {
    return request(path, { method: "DELETE" });
  },
};
