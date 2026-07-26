<div dir="rtl">

# KARINA — ספריית מדיה מרכזית (Media Library)

**סטטוס:** ריכוז וארגון בלבד · **אין למחוק או להזיז קבצים קיימים.**
מסמך זה מרכז את **כל** נכסי המדיה של פרויקט KARINA — תמונות, סרטונים, לוגואים, אייקונים — ומסדר אותם ל‑9 קטגוריות + מעקב לפי מקור (FLOW / ChatGPT / אתר קיים).

> ⚠️ **מצב הנכסים (מעודכן 26.07.2026):** מקור האמת = האתר החי של KARINA. הגישה הישירה אליו חסומה במדיניות הרשת של הסביבה (`karinkeren.com` וגם `media.base44.com` → `403`), אך **אותר מקור זהה ב‑Google Drive** של החשבון (דף הנחיתה הרשמי, Base44 App `69c1a894bc89d9ff0d3d5d28`), וממנו חולצו הנכסים והעובדות.
>
> **נמצאו 2 נכסי מדיה חיים בלבד** (Hero "floating in the sea" + Technical Diagram), מקושרים ב‑Registry כ‑HAVE עם ה‑URL החי. בנוסף `public/images/karin.jpg` בריפו → Founder. כל השאר חסר וממתין להפקה/העלאה. עובדות המוצר: ראו `../karina-brand-facts-SOURCE-OF-TRUTH.md`. **KARINA היא מנקין יחיד בצורת אישה** (לא סדרת דגמים).

---

## 1. מבנה תיקיות (Taxonomy)

```
docs/karina/media-library/
├── README.md                ← מסמך זה
├── media-registry.csv       ← הרשימה המלאה (שורה לכל נכס) — מקור האמת
└── assets/
    ├── 01-hero/             Hero — וידאו/תמונות פתיח ראשיים
    ├── 02-gallery/          Gallery — צילומי מוצר, 360°, סטילס בהקשר
    ├── 03-technology/       Technology — אנטומיה, חומרים, מערכת העלאה
    ├── 04-training/         Training — פרוטוקולי תרגיל, צוותים באימון
    ├── 05-rescue/           Rescue — הדגמות במים, חילוץ, ים גועש, SAR
    ├── 06-monaco/           Monaco — אירועים, שואו, הקשר סופר-יאכטות
    ├── 07-founder/          Founder — דיוקן המייסדת, סיפור, סרט מותג
    ├── 08-concept-vision/   Concept Vision — רינדורי קונספט (FLOW/ChatGPT)
    ├── 09-marketing/        Marketing — סרטוני תעשייה, המלצות, OG, מודעות
    ├── _logos/              כל קבצי הלוגו (וריאנטים)
    └── _icons/              כל האייקונים והתגים
```

**וידאו:** קבצי וידאו נשמרים **בתוך תיקיית הקטגוריה** הרלוונטית (למשל סרטון הדגמה במים → `05-rescue/`), ומסומנים ב‑`type=video` ברישום. כך שמירה על ארגון קטגוריאלי + רשימת וידאו מלאה דרך סינון הרישום.

---

## 2. מוסכמת שמות קבצים (Naming Convention)

```
karina_<קטגוריה>_<תיאור>_<מקור?>_<וריאנט?>.<סיומת>
```
דוגמאות:
- `karina_hero_mob-drill_master_16x9.mp4`
- `karina_gallery_pro_360_012.jpg`
- `karina_concept_vision_flow_003.jpg`   ← מסומן כ‑FLOW
- `karina_concept_ideation_gpt_001.png`  ← מסומן כ‑ChatGPT
- `karina_logo_light.svg`

כללים: אותיות קטנות · מקפים בתיאור · ללא רווחים/עברית בשם הקובץ · מספור דו/תלת ספרתי לרצפים.

---

## 3. מעקב לפי מקור (עונה על הדרישות הספציפיות)

הרישום (`media-registry.csv`) כולל עמודת `source`. סינון לפיה נותן מיידית את הרשימות שביקשת:

| בקשה | סינון בעמודת source |
|------|----------------------|
| כל התמונות שנוצרו ב‑**FLOW** | `source = FLOW` |
| כל התמונות שנוצרו ב‑**ChatGPT** | `source = ChatGPT` |
| כל התמונות מ**האתר הקיים** | `source = Existing-Site` |
| כל **הלוגואים** | `type = logo` (תיקיית `_logos/`) |
| כל **האייקונים** | `type = icon` (תיקיית `_icons/`) |
| כל **הווידאו** | `type = video` |
| כל **התמונות** | `type = image` |

ערכי `source` אפשריים: `FLOW` · `ChatGPT` · `Existing-Site` · `Original-Photo` · `Original-Video` · `Illustration` · `Stock` · `TBD`.

---

## 4. עמודות הרישום (Registry schema)

`asset_id, category, usage, type, source, target_filename, format, orientation_size, maps_to_spec, rights_credit, status, location_or_notes`

- **asset_id** — מזהה ייחודי (למשל `KRN-HERO-001`).
- **maps_to_spec** — קישור לנכס במסמך האפיון (V1–V8 לוידאו, I1–I13 לתמונות).
- **rights_credit** — זכויות/קרדיט (חובה למילוי לפני פרסום).
- **status** — `HAVE` (קיים) · `NEEDED` (חסר, להפיק/לאסוף) · `TO-CONFIRM` (ייתכן שקיים ב‑FLOW/ChatGPT, לאמת).

---

## 5. סטטוס נוכחי (סיכום)

| קטגוריה | נכסים ברישום | קיים (HAVE) | לאימות | חסר |
|---------|--------------|-------------|--------|-----|
| Hero | 3 | 1 | 0 | 2 |
| Gallery | 4 | 0 | 0 | 4 |
| Technology | 5 | 1 | 0 | 4 |
| Training | 3 | 0 | 0 | 3 |
| Rescue | 4 | 0 | 0 | 4 |
| Monaco | 3 | 0 | 0 | 3 |
| Founder | 3 | 1 | 0 | 2 |
| Concept Vision | 3 | 0 | 2 | 1 |
| Marketing | 5 | 0 | 0 | 5 |
| Logos | 6 | 0 | 0 | 6 |
| Icons | 4 | 0 | 0 | 4 |
| **סה"כ** | **43** | **3** | **2** | **38** |

**3 נכסים קיימים (HAVE):**
1. `KRN-HERO-001` — תמונת Hero חיה ("floating in the sea") → URL ב‑Base44 CDN.
2. `KRN-TECH-001` — Technical Diagram חי → URL ב‑Base44 CDN.
3. `KRN-FND-001` — `public/images/karin.jpg` בריפו (Founder). **לא הוזז ולא נמחק.**

---

## 6. איך לאכלס את הספרייה (Populate)

כדי להפוך את הרישום לרשימה אמיתית מלאה, צריך לחבר את מקור הנכסים בפועל. אפשרויות:
1. **Google Drive** — אוכל לחפש בתיקיות KARINA (FLOW/ChatGPT/אתר קיים) ולמלא שמות קבצים אמיתיים.
2. **האתר הקיים** — כתובת ה‑URL, ואוכל למפות את כל התמונות/וידאו שבשימוש.
3. **העלאה ידנית** — להעלות את הקבצים לתיקיות `assets/…` לפי הקטגוריות.

לכל קובץ שמתווסף: הוסיפו שורה ב‑`media-registry.csv`, עדכנו `status=HAVE`, מלאו `source`, `rights_credit`, ומקמו בתיקייה הנכונה.

---

<div dir="ltr">

## English summary

**KARINA Media Library** — central, categorized catalog of every media asset (images, videos, logos, icons). **Organization only — no files deleted or moved.**

**Important:** this repo currently contains only **one** media file — `public/images/karin.jpg` (cataloged under *Founder*). All other assets (FLOW renders, ChatGPT images, existing-site images, logos, icons, videos) are **not in the repo**, so this package delivers the **structure + registry** ready to be populated.

- **9 categories:** Hero · Gallery · Technology · Training · Rescue · Monaco · Founder · Concept Vision · Marketing (+ `_logos`, `_icons`).
- **`media-registry.csv`** is the source of truth — one row per asset with a `source` column (`FLOW` / `ChatGPT` / `Existing-Site` / …) so the FLOW list, ChatGPT list, and existing-site list are simple filters.
- **Videos** live inside their category folder, tagged `type=video`.
- **Status:** 50 assets registered · 1 HAVE · 4 TO-CONFIRM · 45 NEEDED.

**To populate:** point me to the asset source — Google Drive, the existing live site URL, or upload the files — and I'll fill in real filenames, dimensions, and rights per row.

</div>
</div>
