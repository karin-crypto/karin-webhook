"use strict";

/**
 * Authentication: registration with 18+ age verification, login, and JWT
 * session tokens. Passwords are hashed with bcrypt. The auth middleware
 * attaches the current user to req.user.
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("./config");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ageFromDob(dobStr) {
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

function signToken(user) {
  return jwt.sign(
    { uid: user.id, email: user.email },
    config.JWT_SECRET,
    { expiresIn: `${config.SESSION_TTL_DAYS}d` }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, config.JWT_SECRET);
  } catch {
    return null;
  }
}

function register(store) {
  return async (req, res) => {
    try {
      const email = String(req.body.email || "").toLowerCase().trim();
      const password = String(req.body.password || "");
      const displayName = String(req.body.displayName || "").trim();
      const dob = String(req.body.dob || "").trim();
      const ageConfirmed = req.body.ageConfirmed === true || req.body.ageConfirmed === "true";

      if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Please enter a valid email address." });
      if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
      if (!displayName) return res.status(400).json({ error: "Please choose a display name." });

      const age = ageFromDob(dob);
      if (age === null) return res.status(400).json({ error: "Please enter a valid date of birth." });
      if (age < config.MIN_AGE || !ageConfirmed) {
        return res.status(403).json({ error: `You must be at least ${config.MIN_AGE} years old to use this service.` });
      }

      const existing = await store.getUserByEmail(email);
      if (existing) return res.status(409).json({ error: "An account with this email already exists." });

      const passwordHash = await bcrypt.hash(password, 10);
      const isAdmin = config.ADMIN_EMAIL && email === config.ADMIN_EMAIL;

      const user = await store.createUser({
        email, passwordHash, displayName, dob,
        credits: config.SIGNUP_BONUS_CREDITS, isAdmin,
      });

      const token = signToken(user);
      res.json({ token, user: safeUser(user) });
    } catch (err) {
      console.error("register:", err.message);
      res.status(500).json({ error: "Could not create your account. Please try again." });
    }
  };
}

function login(store) {
  return async (req, res) => {
    try {
      const email = String(req.body.email || "").toLowerCase().trim();
      const password = String(req.body.password || "");

      const user = await store.getUserByEmail(email);
      // Compare against a dummy hash on missing user to reduce timing leaks.
      const hash = user ? user.passwordHash : "$2a$10$0000000000000000000000000000000000000000000000000000";
      const ok = await bcrypt.compare(password, hash);
      if (!user || !ok) return res.status(401).json({ error: "Incorrect email or password." });

      const token = signToken(user);
      res.json({ token, user: safeUser(user) });
    } catch (err) {
      console.error("login:", err.message);
      res.status(500).json({ error: "Could not sign you in. Please try again." });
    }
  };
}

// Middleware factory: requires a valid bearer token; loads the fresh user.
function requireAuth(store) {
  return async (req, res, next) => {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const payload = token && verifyToken(token);
    if (!payload) return res.status(401).json({ error: "Not signed in." });

    const user = await store.getUserById(payload.uid);
    if (!user) return res.status(401).json({ error: "Session no longer valid." });
    req.user = user;
    next();
  };
}

function requireAdmin(store) {
  const authMw = requireAuth(store);
  return (req, res, next) => authMw(req, res, () => {
    if (!req.user.isAdmin) return res.status(403).json({ error: "Admin access required." });
    next();
  });
}

function safeUser(u) {
  return {
    id: u.id, email: u.email, displayName: u.displayName,
    credits: u.credits, isAdmin: u.isAdmin,
  };
}

module.exports = { register, login, requireAuth, requireAdmin, signToken, verifyToken, safeUser, ageFromDob };
