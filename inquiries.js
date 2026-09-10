"use strict";

/**
 * Shared inquiries store.
 *
 * A single JSON file (data/inquiries.json) holds customer inquiries. It is
 * written by both the website contact form (POST /api/contact) and Mia's
 * save_inquiry tool, so everything Karin needs to follow up on lands in one
 * place. The data/ directory is gitignored; on ephemeral hosts it resets on
 * redeploy (same behavior as before this refactor).
 */

const path = require("path");
const fs = require("fs");

const DATA_DIR = path.join(__dirname, "data");
const INQUIRIES_FILE = path.join(DATA_DIR, "inquiries.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(INQUIRIES_FILE)) fs.writeFileSync(INQUIRIES_FILE, "[]");
}

/**
 * Persist an inquiry. Returns the stored record (with generated id + date).
 * `source` distinguishes where it came from (e.g. "website", "mia").
 */
function saveInquiry(inquiry) {
  ensureDataDir();
  const list = JSON.parse(fs.readFileSync(INQUIRIES_FILE, "utf8"));
  const record = {
    ...inquiry,
    id: Date.now(),
    date: new Date().toISOString(),
  };
  list.unshift(record);
  fs.writeFileSync(INQUIRIES_FILE, JSON.stringify(list, null, 2));
  return record;
}

function listInquiries() {
  ensureDataDir();
  return JSON.parse(fs.readFileSync(INQUIRIES_FILE, "utf8"));
}

module.exports = { saveInquiry, listInquiries };
