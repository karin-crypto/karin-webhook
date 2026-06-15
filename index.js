const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// WhatsApp business number (without +)
const WA_NUMBER = '972502423356';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Persist inquiries to a local JSON file
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

// POST /api/contact  – save inquiry & return WhatsApp redirect URL
app.post('/api/contact', (req, res) => {
  const { name, phone, email, topic, message } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ ok: false, error: 'שם וטלפון הם שדות חובה' });
  }

  saveInquiry({ name, phone, email, topic, message });

  const topicLabels = {
    pension: 'קרן פנסיה', gemel: 'קופת גמל',
    'bituach-menahalim': 'ביטוח מנהלים',
    hishtalmut: 'קרן השתלמות',
    'insurance-life': 'ביטוח חיים',
    'insurance-health': 'ביטוח בריאות',
    risk: 'ניהול סיכונים', other: 'אחר'
  };

  const waText = encodeURIComponent(
    `שלום קרן!\n` +
    `פנייה חדשה מהאתר:\n` +
    `שם: ${name}\n` +
    `טלפון: ${phone}\n` +
    (email   ? `אימייל: ${email}\n` : '') +
    (topic   ? `נושא: ${topicLabels[topic] || topic}\n` : '') +
    (message ? `הודעה: ${message}` : '')
  );

  res.json({
    ok: true,
    waUrl: `https://wa.me/${WA_NUMBER}?text=${waText}`
  });
});

// GET /api/inquiries – simple admin list (no auth – for demo)
app.get('/api/inquiries', (req, res) => {
  ensureDataDir();
  const list = JSON.parse(fs.readFileSync(INQUIRIES_FILE, 'utf8'));
  res.json(list);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
