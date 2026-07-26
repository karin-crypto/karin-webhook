<div dir="rtl">

# KARINA — רשימת נכסי מדיה נדרשים / חסרים

**עודכן:** 26.07.2026 · מלווה את `media-registry.csv` ואת `README.md`.

## ⚠️ מצב הגישה לאתר החי

מקור האמת הוא `https://yachting.karinkeren.com`, אך **הסביבה הנוכחית חוסמת את כל דומיין `karinkeren.com` ברמת מדיניות הרשת** (נבדק: `yachting.` / `www.` / הדומיין הראשי — כולם מחזירים `403 policy denial` בשער היציאה). לכן **לא ניתן לשלוף את הנכסים החיים מתוך הסביבה הזו כרגע**, ואסור לעקוף חסימת מדיניות.

**כדי שאמפה אוטומטית את האתר החי, צריך אחד מאלה:**
1. מנהל הסביבה יוסיף את `yachting.karinkeren.com` (ורצוי `*.karinkeren.com`) ל‑allowlist של מדיניות היציאה — ראו מדיניות הרשת של הסביבה: https://code.claude.com/docs/en/claude-code-on-the-web
2. או: להריץ את הסשן בסביבה עם גישת רשת רחבה יותר.
3. או: להעלות את הקבצים ישירות לתיקיות `assets/…`.

עד אז — הרשימה למטה היא **מפרט הנכסים המלא הנדרש**. כל שורה כוללת שם קובץ, פורמט ומידות מומלצות. נכס שכבר קיים באתר החי: פשוט יש להפילו לתיקייה המתאימה / למפות את ה‑URL שלו, ולסמן `HAVE` ברישום. נכס שבאמת לא קיים — נשאר כ‑placeholder עד להפקה.

> הערה: מכיוון שהאתר חסום, איני יכול לאשר איזה נכסים כבר קיימים עליו. משום כך הרשימה מייצגת את **מלוא הסט הנדרש**; לאחר פתיחת הדומיין (או קבלת רשימת הקבצים מהאתר) אעדכן סטטוסים ל‑HAVE לכל מה שכבר חי, ואשאיר placeholder רק למה שחסר באמת.

---

## מקרא פורמטים ומידות
- **תמונות רספונסיביות:** לספק AVIF/WebP + JPG fallback. המידות למטה = הרזולוציה המקורית לייצוא (מוקטנת אוטומטית ל‑srcset).
- **וידאו:** MP4 (H.264/H.265) + WebM (VP9), מקור ‎1080p ומעלה; לצרף Poster ו‑captions EN/HE.
- **לוגו/אייקון:** SVG וקטורי (מקור) + ייצוא PNG שקוף.

---

## 1. Hero
| שם קובץ | פורמט | מידות מומלצות | הערות |
|---|---|---|---|
| `karina_hero_mob-drill_master_16x9.mp4` | MP4 + WebM | 3840×2160 (מקור) → 1920×1080 | לולאה, מושתק, 20–40 ש' |
| `karina_hero_mob-drill_9x16.mp4` | MP4 + WebM | 1080×1920 | חיתוך אנכי למובייל |
| `karina_hero_poster_16x9.jpg` | JPG/WebP | 1920×1080 | Poster + fallback ל‑reduced-motion |
| `karina_hero_product_{pro\|lite\|cadet\|sar}.jpg` | JPG/WebP | 1920×1080 | Hero לכל עמוד מוצר (×4) |

## 2. Gallery
| שם קובץ | פורמט | מידות מומלצות | הערות |
|---|---|---|---|
| `karina_gallery_{model}_360_###.jpg` | JPG/WebP | 2000×2000 | רצף 24–36 פריימים לכל דגם |
| `karina_gallery_{model}_###.jpg` | JPG/WebP | 2000×2000 (1:1) | צילומי סטודיו, זוויות מרובות |
| `karina_gallery_incontext_###.jpg` | JPG/WebP | 2400×1600 (3:2) | סטילס בהקשר — סיפון/מים |
| `karina_gallery_accessories_###.jpg` | JPG/WebP | 2000×2000 | רתמות/חבלים/תיקים/ערכות |

## 3. Technology
| שם קובץ | פורמט | מידות מומלצות | הערות |
|---|---|---|---|
| `karina_tech_anatomy-cutaway.svg` | SVG (או PNG שקוף 2400×1600) | וקטור | בסיס לנקודות חמות אינטראקטיביות |
| `karina_tech_materials_macro_###.jpg` | JPG/WebP | 2400×1600 | מאקרו חומרים/תפרים |
| `karina_tech_hivis-reflective_###.jpg` | JPG/WebP | 2400×1600 | נראות/מחזירי אור |
| `karina_tech_recovery-lift.mp4` | MP4 + WebM | 1920×1080 | לולאה קצרה 15–20 ש' |
| `karina_tech_explainer.mp4` | MP4 + WebM | 1920×1080 | הסבר אנימציה 60–90 ש' |

## 4. Training
| שם קובץ | פורמט | מידות מומלצות | הערות |
|---|---|---|---|
| `karina_training_protocol_###.mp4` | MP4 + WebM | 1920×1080 | פרוטוקול שלב-אחר-שלב 2–4 דק' |
| `karina_training_crew_###.jpg` | JPG/WebP | 2400×1600 | צוותים באימון |
| `karina_training_checklist_thumb.png` | PNG | 1200×1200 | תמונות ממוזערות של צ'קליסטים |

## 5. Rescue
| שם קובץ | פורמט | מידות מומלצות | הערות |
|---|---|---|---|
| `karina_rescue_demo_{model}.mp4` | MP4 + WebM | 1920×1080 | הדגמת מים לכל דגם |
| `karina_rescue_roughsea_###.jpg` | JPG/WebP | 2400×1600 | ים גועש / העלאה |
| `karina_rescue_sar-heli_###.jpg` | JPG/WebP | 2400×1600 | חילוץ SAR / מסוק |
| `karina_rescue_night_flow.mp4` | MP4 + WebM | 1920×1080 | לילה/נראות (ייתכן FLOW) |

## 6. Monaco
| שם קובץ | פורמט | מידות מומלצות | הערות |
|---|---|---|---|
| `karina_monaco_event_###.jpg` | JPG/WebP | 2400×1600 | צילומי אירוע/תערוכה |
| `karina_monaco_superyacht_###.jpg` | JPG/WebP | 2400×1600 | הקשר סופר-יאכטות |
| `karina_monaco_highlights.mp4` | MP4 + WebM | 1920×1080 | סרט תקציר אירוע |

## 7. Founder
| שם קובץ | פורמט | מידות מומלצות | הערות |
|---|---|---|---|
| `karin.jpg` ✅ | JPG | קיים | דיוקן מייסדת — **קיים** (`public/images/karin.jpg`), לא להזיז |
| `karina_founder_portrait.jpg` | JPG/WebP | 1600×2000 (4:5) | דיוקן ברזולוציה גבוהה לאתר החדש |
| `karina_founder_action_###.jpg` | JPG/WebP | 2400×1600 | מייסדת עם המוצר |
| `karina_founder_story.mp4` | MP4 + WebM | 1920×1080 | סרט מותג/חזון |

## 8. Concept Vision
| שם קובץ | פורמט | מידות מומלצות | הערות |
|---|---|---|---|
| `karina_concept_vision_flow_###.jpg` | JPG/WebP | 1920×1080 | רינדורי FLOW — חזון עתידי |
| `karina_concept_ideation_gpt_###.png` | PNG | 1536×1024 (או 1024×1024) | קונספטים מ‑ChatGPT |
| `karina_concept_vision.mp4` | MP4 + WebM | 1920×1080 | סרט חזון |

## 9. Marketing
| שם קובץ | פורמט | מידות מומלצות | הערות |
|---|---|---|---|
| `karina_mkt_industry_###.mp4` | MP4 + WebM | 1920×1080 | 8 סרטוני תעשייה |
| `karina_mkt_testimonial_###.mp4` | MP4 + WebM | 1920×1080 | קטעי המלצה |
| `karina_mkt_og_###.jpg` | JPG | 1200×630 | תמונות שיתוף OG לכל עמוד מרכזי |
| `karina_mkt_ad_square.jpg` / `_portrait` / `_story` | JPG/WebP | 1080×1080 / 1080×1350 / 1080×1920 | מודעות רשתות |
| `karina_mkt_brochure_###.jpg` | JPG/PDF | 2480×3508 (A4 300dpi) | ויזואלים לחוברת/דף מפרט |

## לוגואים (`_logos/`)
| שם קובץ | פורמט | מידות מומלצות | הערות |
|---|---|---|---|
| `karina_logo_primary.svg` | SVG | וקטור | + ייצוא PNG רוחב 1000px |
| `karina_logo_light.svg` | SVG | וקטור | על רקע כהה |
| `karina_logo_dark.svg` | SVG | וקטור | על רקע בהיר |
| `karina_logo_mono.svg` | SVG | וקטור | מונוכרום |
| `karina_symbol.svg` | SVG | וקטור | סמל בלבד |
| `karina_wordmark.svg` | SVG | וקטור | טקסט בלבד |
| `karina_favicon.ico` | ICO + PNG | 512×512 מקור → 16/32/48 | |
| `karina_appicon_{180\|192\|512}.png` | PNG | 180 / 192 / 512 | Apple touch + Android + PWA |

## אייקונים (`_icons/`)
| שם קובץ | פורמט | מידות מומלצות | הערות |
|---|---|---|---|
| `karina_icon_value_###.svg` | SVG | רשת 48px | ריאליסטי/עמיד/תקין |
| `karina_icon_feature_###.svg` | SVG | רשת 48px | תכונות טכנולוגיה |
| `karina_icon_industry_###.svg` | SVG | רשת 48px | 8 תעשיות |
| `karina_icon_ui_###.svg` | SVG | רשת 24px | ניווט/חיפוש/חצים (וריאנט RTL) |
| `karina_badge_###.svg` | SVG | וקטור | תגי תקן (הקשר SOLAS/IMO) |

---

<div dir="ltr">

## English summary — Required / Missing Assets

**Source of truth:** `https://yachting.karinkeren.com`. **Blocker:** this session's egress policy blocks the whole `karinkeren.com` domain (`403 policy denial`, confirmed on `yachting.`/`www.`/apex), so live assets **cannot be pulled from here** and policy denials must not be bypassed.

**To let me map the live site automatically,** an environment admin must allowlist `yachting.karinkeren.com` (ideally `*.karinkeren.com`) in the environment network policy (https://code.claude.com/docs/en/claude-code-on-the-web) — or run in an environment with broader network access — or upload the files into `assets/`.

The tables above are the **complete required asset set** (filename · format · recommended dimensions) across all 9 categories + logos + icons. Any asset already live on the site just needs to be dropped into its category folder / URL-mapped and flagged `HAVE`; only genuinely non-existent assets stay as placeholders. **One asset already exists:** `public/images/karin.jpg` (Founder) — not moved, not deleted.

</div>
</div>
