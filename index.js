const express = require('express');
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');

const { createStore }   = require('./store');
const { generateReply, MIA_MODEL, claudeEnabled, autoReplyEnabled } = require('./agent');
const { registerWhatsApp, whatsappConfigured }    = require('./whatsapp');

const app  = express();
const PORT = process.env.PORT || 3000;
const WA_NUMBER = '972502423356';

const miaStore = createStore();

// rawBody is needed by the WhatsApp channel to verify X-Hub-Signature-256.
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

/* ========================
   DATA PERSISTENCE
   ======================== */
const INQUIRIES_FILE = path.join(__dirname, 'data', 'inquiries.json');
function ensureDataDir() {
  const dir = path.join(__dirname, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(INQUIRIES_FILE)) fs.writeFileSync(INQUIRIES_FILE, '[]');
}
function saveInquiry(inquiry) {
  ensureDataDir();
  const list = JSON.parse(fs.readFileSync(INQUIRIES_FILE, 'utf8'));
  list.unshift({ ...inquiry, id: Date.now(), date: new Date().toISOString() });
  fs.writeFileSync(INQUIRIES_FILE, JSON.stringify(list, null, 2));
}

/* ========================
   TWILIO SMS
   ======================== */
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('Twilio initialized');
  } catch (e) {
    console.warn('Twilio package not installed. Run: npm install twilio');
  }
}

async function sendSMS(toRaw, body) {
  const to = formatPhoneIL(toRaw);
  if (twilioClient && process.env.TWILIO_FROM_NUMBER) {
    await twilioClient.messages.create({ body, from: process.env.TWILIO_FROM_NUMBER, to });
    console.log(`SMS sent to ${to}`);
  } else {
    // Dev mode – print OTP to server logs instead of sending real SMS
    console.log(`[SMS-DEV] To: ${to} | ${body}`);
  }
}

function formatPhoneIL(phone) {
  const d = String(phone).replace(/\D/g, '');
  if (d.startsWith('972')) return '+' + d;
  if (d.startsWith('0'))   return '+972' + d.slice(1);
  return '+972' + d;
}

/* ========================
   OTP & SESSION STORES (in-memory)
   ======================== */
const otpStore     = new Map(); // idNumber -> { otp, expires, phone, clientName, clientData }
const sessionStore = new Map(); // token    -> { idNumber, expires, clientName, clientData }
const rateMap      = new Map(); // idNumber -> [timestamps]

const OTP_TTL_MS     = (parseInt(process.env.OTP_EXPIRY_MINUTES) || 10) * 60 * 1000;
const SESSION_TTL_MS = 4 * 60 * 60 * 1000;
const OTP_MAX_TRIES  = 3;  // per 15 minutes per ID

function genOTP()  { return (100000 + crypto.randomInt(900000)).toString(); }

function validateIsraeliId(raw) {
  const id = String(raw).replace(/\D/g, '').padStart(9, '0');
  if (id.length !== 9) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = parseInt(id[i]) * (i % 2 === 0 ? 1 : 2);
    if (n > 9) n -= 9;
    sum += n;
  }
  return sum % 10 === 0;
}

function maskPhone(phone) {
  const d = String(phone).replace(/\D/g, '');
  if (d.length < 6) return '***';
  return d.slice(0, 3) + '-****' + d.slice(-2);
}

function isRateLimited(id) {
  const now = Date.now(), win = 15 * 60 * 1000;
  const ts = (rateMap.get(id) || []).filter(t => now - t < win);
  rateMap.set(id, ts);
  if (ts.length >= OTP_MAX_TRIES) return true;
  ts.push(now);
  return false;
}

function getSession(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const s = sessionStore.get(token);
  if (!s) return null;
  if (Date.now() > s.expires) { sessionStore.delete(token); return null; }
  return { ...s, token };
}

/* ========================
   ROETO (ראוטרו) API ADAPTER
   ========================
   Supports two auth modes:
   Mode A – OAuth2 client credentials (Roeto default):
     ROETO_API_URL        – e.g. https://api.roeto.co.il
     ROETO_CLIENT_ID      – Client ID from Roeto API settings
     ROETO_CLIENT_SECRET  – Client Secret from Roeto API settings
     ROETO_TOKEN_PATH     – token endpoint path (default: /oauth/token)
   Mode B – Simple API key:
     ROETO_API_URL   – base URL
     ROETO_API_KEY   – Bearer token
   Optional:
     ROETO_CLIENT_PATH – path with {id} (default: /api/clients/{id})
     ROETO_PHONE_FIELD – JSON field for phone (default: phone)
     ROETO_NAME_FIELD  – JSON field for name  (default: name)
   ======================== */
let _roetoToken = null; // { value, expiresAt }

async function getRoetoAccessToken() {
  if (_roetoToken && Date.now() < _roetoToken.expiresAt - 60000) {
    return _roetoToken.value;
  }
  const base         = process.env.ROETO_API_URL;
  const clientId     = process.env.ROETO_CLIENT_ID;
  const clientSecret = process.env.ROETO_CLIENT_SECRET;
  const tokenPath    = process.env.ROETO_TOKEN_PATH || '/oauth/token';

  const res = await fetch(base + tokenPath, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`Roeto token ${res.status}: ${await res.text()}`);
  const json = await res.json();
  _roetoToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in || 3600) * 1000 };
  return _roetoToken.value;
}

async function fetchRoetoClient(idNumber) {
  const base = process.env.ROETO_API_URL;
  if (!base) return null; // dev mode – not configured

  let authHeader;
  if (process.env.ROETO_CLIENT_ID && process.env.ROETO_CLIENT_SECRET) {
    const token = await getRoetoAccessToken();
    authHeader = `Bearer ${token}`;
  } else if (process.env.ROETO_API_KEY) {
    authHeader = `Bearer ${process.env.ROETO_API_KEY}`;
  } else {
    return null;
  }

  const pathTpl = process.env.ROETO_CLIENT_PATH || '/api/clients/{id}';
  const url = base + pathTpl.replace('{id}', encodeURIComponent(idNumber));

  const res = await fetch(url, {
    headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Roeto API ${res.status}: ${await res.text()}`);

  const raw = await res.json();
  const pf  = process.env.ROETO_PHONE_FIELD || 'phone';
  const nf  = process.env.ROETO_NAME_FIELD  || 'name';

  return {
    _raw:      raw,
    phone:     raw[pf]  || raw.mobile || raw.cellPhone || raw.phone,
    name:      raw[nf]  || raw.fullName || raw.clientName || raw.name || 'לקוח/ה',
    policies:  raw.policies  || raw.insurances || raw.policyList || [],
    documents: raw.documents || raw.files      || raw.docList    || [],
    summary:   raw.summary   || raw.dashboard  || null,
  };
}

/* ========================
   POST /api/auth/request-otp
   Body: { id_number: "123456789" }
   ======================== */
app.post('/api/auth/request-otp', async (req, res) => {
  const raw = String(req.body.id_number || '').replace(/\D/g, '').padStart(9, '0');

  if (!validateIsraeliId(raw)) {
    return res.status(400).json({ ok: false, error: 'מספר תעודת זהות לא תקין' });
  }

  if (isRateLimited(raw)) {
    return res.status(429).json({ ok: false, error: 'ניסיונות רבים מדי. נסי שוב בעוד 15 דקות.' });
  }

  try {
    let phone, clientName, clientData;

    const client = await fetchRoetoClient(raw);

    if (client === null && (process.env.ROETO_API_URL && process.env.ROETO_API_KEY)) {
      return res.status(404).json({ ok: false, error: 'לא נמצא לקוח עם תעודת זהות זו במערכת.' });
    }

    if (client) {
      phone      = client.phone;
      clientName = client.name;
      clientData = client;
    } else {
      // Roeto not configured → dev/demo mode
      phone      = process.env.DEV_TEST_PHONE || '0501234567';
      clientName = 'לקוח/ה יקר/ה';
      clientData = null;
    }

    if (!phone) {
      return res.status(500).json({ ok: false, error: 'לא נמצא מספר טלפון מקושר לתעודת זהות זו.' });
    }

    const otp = genOTP();
    otpStore.set(raw, { otp, expires: Date.now() + OTP_TTL_MS, phone, clientName, clientData });

    await sendSMS(phone, `קרן קרן פיננסים | קוד כניסה לפורטל: ${otp} (בתוקף ${OTP_TTL_MS / 60000} דקות)`);

    res.json({ ok: true, phone: maskPhone(phone) });

  } catch (err) {
    console.error('request-otp:', err.message);
    res.status(500).json({ ok: false, error: 'שגיאה בשליחת הקוד. נסי שוב.' });
  }
});

/* ========================
   POST /api/auth/verify-otp
   Body: { id_number, otp }
   ======================== */
app.post('/api/auth/verify-otp', (req, res) => {
  const raw = String(req.body.id_number || '').replace(/\D/g, '').padStart(9, '0');
  const otp = String(req.body.otp || '').trim();

  const record = otpStore.get(raw);
  if (!record)                    return res.status(401).json({ ok: false, error: 'לא נשלח קוד. בקשי קוד חדש.' });
  if (Date.now() > record.expires){ otpStore.delete(raw); return res.status(401).json({ ok: false, error: 'הקוד פג תוקף. בקשי קוד חדש.' }); }
  if (record.otp !== otp)         return res.status(401).json({ ok: false, error: 'קוד שגוי. נסי שוב.' });

  otpStore.delete(raw);

  const token = crypto.randomBytes(32).toString('hex');
  sessionStore.set(token, {
    idNumber:   raw,
    clientName: record.clientName,
    clientData: record.clientData,
    expires:    Date.now() + SESSION_TTL_MS,
  });

  res.json({ ok: true, token, name: record.clientName });
});

/* ========================
   POST /api/auth/logout
   ======================== */
app.post('/api/auth/logout', (req, res) => {
  const s = getSession(req);
  if (s) sessionStore.delete(s.token);
  res.json({ ok: true });
});

/* ========================
   GET /api/client/data
   ======================== */
app.get('/api/client/data', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ ok: false, error: 'לא מחובר. התחברי מחדש.' });

  try {
    const fresh = await fetchRoetoClient(session.idNumber);
    const data  = fresh || session.clientData;
    res.json({ ok: true, data, name: session.clientName });
  } catch (err) {
    console.error('client/data:', err.message);
    res.json({ ok: true, data: session.clientData, name: session.clientName });
  }
});

/* ========================
   POST /api/contact
   ======================== */
app.post('/api/contact', (req, res) => {
  const { name, phone, email, topic, message } = req.body;
  if (!name || !phone) return res.status(400).json({ ok: false, error: 'שם וטלפון הם שדות חובה' });

  saveInquiry({ name, phone, email, topic, message });

  const topicLabels = {
    pension: 'קרן פנסיה', gemel: 'קופת גמל',
    'bituach-menahalim': 'ביטוח מנהלים', hishtalmut: 'קרן השתלמות',
    'insurance-life': 'ביטוח חיים', 'insurance-health': 'ביטוח בריאות',
    risk: 'ניהול סיכונים', other: 'אחר'
  };
  const waText = encodeURIComponent(
    `שלום קרן!\nפנייה חדשה מהאתר:\nשם: ${name}\nטלפון: ${phone}\n` +
    (email   ? `אימייל: ${email}\n` : '') +
    (topic   ? `נושא: ${topicLabels[topic] || topic}\n` : '') +
    (message ? `הודעה: ${message}` : '')
  );
  res.json({ ok: true, waUrl: `https://wa.me/${WA_NUMBER}?text=${waText}` });
});

app.get('/api/inquiries', (req, res) => {
  ensureDataDir();
  res.json(JSON.parse(fs.readFileSync(INQUIRIES_FILE, 'utf8')));
});

/* ========================
   MIA – AI CUSTOMER SERVICE AGENT
   Chat page: /mia.html | Generic webhook + WhatsApp channel
   ======================== */
app.post('/webhook', async (req, res) => {
  try {
    const message = req.body && req.body.message;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: "Missing 'message' (string) in request body." });
    }
    const sessionId =
      (req.body && req.body.sessionId) ||
      `sess_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

    // Automatic replies are disabled — acknowledge without generating a reply.
    if (!autoReplyEnabled) {
      return res.json({ reply: null, sessionId, autoReplyDisabled: true });
    }

    const reply = await generateReply(miaStore, sessionId, message);
    res.json({ reply, sessionId });
  } catch (err) {
    console.error('Unexpected error in /webhook:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

registerWhatsApp(app, miaStore);

app.get('/health', (req, res) => res.json({
  status: 'ok',
  mia: { claudeEnabled, autoReply: autoReplyEnabled, model: MIA_MODEL, store: miaStore.kind, whatsapp: whatsappConfigured },
}));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

/* ========================
   CLEANUP EXPIRED RECORDS (every 5 min)
   ======================== */
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of otpStore)     if (now > v.expires) otpStore.delete(k);
  for (const [k, v] of sessionStore) if (now > v.expires) sessionStore.delete(k);
}, 5 * 60 * 1000);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  if (!process.env.ROETO_API_URL) console.warn('⚠  ROETO_API_URL not set – Roeto integration disabled (dev/demo mode)');
  if (!twilioClient)              console.warn('⚠  Twilio not configured – OTP codes printed to console');
  if (!autoReplyEnabled) console.warn('⚠  Mia auto-reply DISABLED – inbound messages received but not answered (set MIA_AUTO_REPLY=true to enable)');
  console.log(
    `Mia: Claude ${claudeEnabled ? 'enabled' : 'disabled (rule-based fallback)'} | ` +
    `auto-reply: ${autoReplyEnabled ? 'on' : 'off'} | ` +
    `model: ${MIA_MODEL} | store: ${miaStore.kind} | ` +
    `whatsapp: ${whatsappConfigured ? 'configured' : 'not configured'}`
  );
});

// Graceful shutdown so Mia's DB connections close cleanly.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(async () => {
      await miaStore.close();
      process.exit(0);
    });
  });
}
