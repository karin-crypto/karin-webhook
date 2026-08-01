// Shared front-end helpers: token storage + fetch wrapper.
const TOKEN_KEY = "companion_token";

const Auth = {
  get token() { return localStorage.getItem(TOKEN_KEY); },
  set token(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); },
  logout() { this.token = null; location.href = "/"; },
};

async function api(pathname, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && Auth.token) headers.Authorization = `Bearer ${Auth.token}`;
  const res = await fetch(pathname, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (res.status === 401 && auth) {
    // Session invalid — bounce to landing.
    Auth.token = null;
    if (!location.pathname.endsWith("index.html") && location.pathname !== "/") location.href = "/";
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function money(cents) { return "$" + (Number(cents) / 100).toFixed(2); }
