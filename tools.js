"use strict";

/**
 * Mia's tools — what turns her from a text responder into an agent.
 *
 * Each tool has a schema (sent to Claude) and an executor (run when Claude
 * decides to call it). Tools are intentionally scoped to data the server
 * itself controls, so Mia can act truthfully without external credentials:
 *
 *   get_business_info  — grounded facts about the agency (services, contact,
 *                        portal). Keeps Mia from inventing details.
 *   save_inquiry       — captures a lead (name + phone + topic) into the same
 *                        inquiries store the website contact form uses, so
 *                        Karin can follow up. Optionally flags a callback.
 *
 * SECURITY NOTE — client lookup by ID (Roeto) is deliberately NOT exposed here.
 * That data is PII gated behind the portal's OTP flow; surfacing it to an
 * unauthenticated chat/WhatsApp conversation would be a data-disclosure risk.
 * To add authenticated tools later, gate them on a verified session and add
 * their schema + executor below.
 */

const { saveInquiry } = require("./inquiries");
const { calendarConfigured, createCalendarEvent } = require("./calendar");

// Business name Mia represents (kept in sync with agent.js via env).
const MIA_BUSINESS = process.env.MIA_BUSINESS || "החברה";
// WhatsApp contact number for the agency (used across the site).
const CONTACT_WHATSAPP = process.env.MIA_CONTACT_WHATSAPP || "972502423356";

// Grounded facts Mia is allowed to state. Edit these to match the real agency.
const BUSINESS_INFO = {
  name: MIA_BUSINESS,
  services: [
    "קרן פנסיה",
    "קופת גמל",
    "ביטוח מנהלים",
    "קרן השתלמות",
    "ביטוח חיים",
    "ביטוח בריאות",
    "ניהול סיכונים וייעוץ פיננסי",
  ],
  contact: {
    whatsapp: `+${CONTACT_WHATSAPP}`,
    whatsapp_link: `https://wa.me/${CONTACT_WHATSAPP}`,
    client_portal: "/portal.html",
    booking:
      "לקביעת שיחת ייעוץ אפשר להשאיר שם וטלפון ומיה תיצור פנייה, או לפנות ישירות בוואטסאפ.",
  },
  notes:
    "מיה אינה מוסרת מחירים, תשואות או מדיניות ספציפית — נציג/ה אנושי/ת חוזר/ת עם פרטים מדויקים.",
};

const TOOLS = [
  {
    name: "get_business_info",
    description:
      "מחזיר עובדות מאומתות על הסוכנות: רשימת השירותים, דרכי יצירת קשר, קישור לפורטל הלקוחות ואופן קביעת פגישה. יש להשתמש בכלי לפני מענה על שאלות עובדתיות לגבי מה הסוכנות מציעה או איך יוצרים קשר, כדי לא להמציא פרטים.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "save_inquiry",
    description:
      "שומר פנייה של לקוח כדי שנציג/ה אנושי/ת יחזרו אליו. יש להשתמש כאשר הלקוח מבקש שיחזרו אליו, רוצה להתקדם עם מוצר/שירות, או כשהנושא דורש טיפול אנושי. יש לאסוף לפחות שם וטלפון לפני הקריאה — אם חסר מידע, קודם שאלי את הלקוח.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "שם הלקוח" },
        phone: { type: "string", description: "מספר טלפון ליצירת קשר" },
        topic: {
          type: "string",
          description:
            "נושא הפנייה (למשל: פנסיה, קופת גמל, ביטוח חיים, קרן השתלמות, אחר)",
        },
        message: {
          type: "string",
          description: "תקציר קצר של בקשת הלקוח בלשונו",
        },
        callback: {
          type: "boolean",
          description: "האם הלקוח ביקש במפורש שיחזרו אליו טלפונית",
        },
      },
      required: ["name", "phone"],
    },
  },
  {
    name: "book_meeting",
    description:
      "קובע פגישת ייעוץ עם הלקוח. יש להשתמש כשהלקוח רוצה לקבוע פגישה/שיחת ייעוץ במועד מסוים. לפני הקריאה: ודאי מול הלקוח את השם, הטלפון והמועד המבוקש (תאריך ושעה), והמירי אותם למועד קונקרטי בשעון ישראל. אם הלקוח נותן מועד מעורפל ('בבוקר', 'בשבוע הבא') — הציעי מועד ספציפי ואשרי איתו לפני הקריאה. אל תמציאי שהפגישה נקבעה מבלי לקרוא לכלי בפועל.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "שם הלקוח" },
        phone: { type: "string", description: "מספר טלפון ליצירת קשר" },
        start: {
          type: "string",
          description:
            "מועד ההתחלה בשעון ישראל בפורמט YYYY-MM-DDTHH:MM (למשל 2026-07-20T09:00). ללא אזור זמן — המערכת מפרשת בשעון ישראל.",
        },
        duration_minutes: {
          type: "integer",
          description: "משך הפגישה בדקות (ברירת מחדל 30).",
        },
        topic: { type: "string", description: "נושא הפגישה" },
      },
      required: ["name", "phone", "start"],
    },
  },
];

// --- Executors ---------------------------------------------------------------

function getBusinessInfo() {
  return BUSINESS_INFO;
}

function saveInquiryTool(input = {}) {
  const name = String(input.name || "").trim();
  const phone = String(input.phone || "").trim();
  if (!name || !phone) {
    return {
      ok: false,
      error: "חסרים שם או טלפון. יש לאסוף את שניהם מהלקוח לפני שמירת הפנייה.",
    };
  }
  const record = saveInquiry({
    name,
    phone,
    topic: input.topic ? String(input.topic).trim() : undefined,
    message: input.message ? String(input.message).trim() : undefined,
    callback: Boolean(input.callback),
    source: "mia",
  });
  return {
    ok: true,
    id: record.id,
    message:
      "הפנייה נשמרה בהצלחה. נציג/ה יחזרו ללקוח. אפשר לאשר ללקוח שהפנייה התקבלה.",
  };
}

const START_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

async function bookMeetingTool(input = {}) {
  const name = String(input.name || "").trim();
  const phone = String(input.phone || "").trim();
  const start = String(input.start || "").trim();
  const durationMinutes = Number(input.duration_minutes) > 0
    ? Number(input.duration_minutes)
    : 30;
  const topic = input.topic ? String(input.topic).trim() : undefined;

  if (!name || !phone) {
    return { ok: false, error: "חסרים שם או טלפון. יש לאסוף את שניהם מהלקוח." };
  }
  if (!START_RE.test(start)) {
    return {
      ok: false,
      error:
        "מועד לא תקין. יש להעביר start בפורמט YYYY-MM-DDTHH:MM בשעון ישראל (למשל 2026-07-20T09:00).",
    };
  }

  const summary = `פגישת ייעוץ – ${name}`;
  const description =
    `נקבע דרך מיה (סוכנת שירות).\nלקוח: ${name}\nטלפון: ${phone}` +
    (topic ? `\nנושא: ${topic}` : "");

  // If the calendar is configured, create a real event; always keep a record.
  if (calendarConfigured) {
    try {
      const ev = await createCalendarEvent({ summary, description, start, durationMinutes });
      saveInquiry({
        type: "meeting",
        status: "booked",
        name,
        phone,
        topic,
        start: ev.start,
        durationMinutes,
        calendarEventId: ev.id,
        calendarLink: ev.htmlLink,
        source: "mia",
      });
      return {
        ok: true,
        status: "booked",
        start: ev.start,
        link: ev.htmlLink,
        message:
          "הפגישה נקבעה ונוספה ליומן. אפשר לאשר ללקוח את המועד ולומר שנשלח תזכורת.",
      };
    } catch (err) {
      console.error("book_meeting calendar error:", err.message);
      // Fall through to saving a pending request so nothing is lost.
    }
  }

  const record = saveInquiry({
    type: "meeting",
    status: "pending",
    name,
    phone,
    topic,
    start,
    durationMinutes,
    source: "mia",
  });
  return {
    ok: true,
    status: "pending",
    id: record.id,
    start,
    message:
      "בקשת הפגישה נשמרה ותאושר ידנית. אפשר לומר ללקוח שנחזור אליו לאישור המועד — אך לא לומר שהפגישה כבר מאושרת ביומן.",
  };
}

const EXECUTORS = {
  get_business_info: getBusinessInfo,
  save_inquiry: saveInquiryTool,
  book_meeting: bookMeetingTool,
};

/**
 * Run a tool by name. Always resolves to a string (JSON) suitable for a
 * tool_result content block. Never throws — a failed tool returns an error
 * payload so Claude can recover gracefully in-conversation.
 */
async function runTool(name, input) {
  const fn = EXECUTORS[name];
  if (!fn) {
    return JSON.stringify({ ok: false, error: `Unknown tool: ${name}` });
  }
  try {
    const result = await fn(input || {});
    return JSON.stringify(result);
  } catch (err) {
    console.error(`Tool "${name}" failed:`, err.message);
    return JSON.stringify({ ok: false, error: "שגיאה בהרצת הכלי." });
  }
}

module.exports = { TOOLS, runTool, BUSINESS_INFO };
