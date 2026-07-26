---
name: karin-keren-actuarial-balance-comparison
description: >
  Karin's workflow for backing up a pension-fund transfer recommendation with an
  actuarial-balance (איזון אקטוארי) comparison. Use this skill WHENEVER Karin, inside a
  recommendation or a portfolio analysis (המלצה / ניתוח תיק / הצעה פנסיונית), recommends
  moving or transferring a pension fund AND notes a negative actuarial balance — phrasings
  like "ממליצה לנייד קרן פנסיה", "כדאי לנייד את הפנסיה", "מומלץ לעבור מקרן", "לעבור קרן פנסיה",
  combined with "איזון אקטוארי שלילי", "איזון אקטוארי מינוס", or an actuarial balance shown as
  a negative percent. When triggered, pull the fund's card from mygemel.net showing the
  negative balance, place it side by side with a positive-balance fund on the SAME age track,
  compute the gap between them, and translate it into a shekel impact on the client's balance.
  Trigger this even if Karin does not explicitly ask for a screenshot or a calculation — the
  side-by-side comparison is the expected backup for this kind of recommendation. Do NOT trigger
  for provident/gemel or study-fund (השתלמות) transfers that are not pension funds, or for
  recommendations that don't rest on the actuarial balance.
---

# Actuarial-Balance Comparison for a Pension-Transfer Recommendation

When Karin recommends moving a client out of a pension fund because its **actuarial balance
(איזון אקטוארי)** is negative, this skill turns that sentence into evidence: the official
mygemel.net card of the losing fund showing the red negative balance, next to a fund with a
green positive balance on the same age track, plus a clear calculation of the gap and what it
means in shekels for the client. The goal is that Karin writes one recommendation line and gets
back a client-ready comparison she can paste into a proposal or send on WhatsApp.

## What the actuarial balance is (one paragraph, so the comparison is honest)

In a comprehensive pension fund the members share mutual insurance (ביטוח הדדי). Every balancing
period the fund's actuary checks whether the insurance pool ran a surplus or a deficit. A
**positive** balance (green, e.g. Meitav **+0.10%**) means a surplus was distributed and members'
balances were nudged **up**. A **negative** balance (red, e.g. Harel **−0.07%**) means a deficit
was covered by trimming members' balances **down**. It is one snapshot for one period and it can
change sign next period — so present it as a **supporting indicator**, alongside returns (תשואה)
and management fees (דמי ניהול), never as the single decisive reason. See
`references/actuarial-balance-explainer.md` for the full method and caveats before you compute.

## Step 1 — Identify the two funds

1. **The losing fund** (negative balance): the pension fund Karin is recommending the client
   leave. Get its exact name and **age track** (e.g. "הראל פנסיה — גילאי 50 ומטה"). The age track
   matters — read it off the fund name/card.
2. **The comparison fund** (positive balance):
   - If Karin named a **destination** fund she's moving the client to, use that one.
   - Otherwise pick a well-known fund with a positive balance **on the same age track and same
     reporting month** (Meitav, Mor, Altshuler and Migdal are common positive comparators). Say
     explicitly that it is an illustrative comparator, not necessarily the destination.
   - Never compare across different age tracks or different reporting months — it is not
     apples-to-apples and undermines the point.

If any of this is ambiguous (which fund, which age track, is there a chosen destination), ask
Karin one short question rather than guessing.

## Step 2 — Get the mygemel.net cards (screenshots)

The source is **mygemel.net** (מיי גמל נט), which presents the official משרד האוצר / רשות שוק ההון
data. Each fund's page shows a "מידע כללי" card with: מספר חברה מנהלת, מספר רישוי מסלול,
**איזון אקטוארי** (colored red/green), and סך נכסי המסלול. That colored actuarial-balance line is
the star of the screenshot.

Get one card image per fund, in this order of preference:

1. **Live screenshot (preferred).** Capture the fund's mygemel.net card with the helper:
   `node scripts/capture-mygemel-card.mjs "<fund mygemel.net URL>" <output.png>`
   (It uses the pre-installed Chromium at a mobile viewport, matching how the cards look on
   phones.) Find the URL by searching the fund + age track on mygemel.net. If the network blocks
   mygemel.net or Chromium isn't available, fall through to option 2 — do not stall.
2. **Karin's own screenshots.** If Karin pasted the cards into the chat (as in the reference
   examples), use those directly — they are already the real source of truth.
3. **Branded reproduction (fallback).** If no screenshot is obtainable, reproduce the card
   faithfully from the figures using `assets/comparison-template.html` (see Step 3). Reproductions
   must carry every figure exactly and be clearly labeled "שוחזר מנתוני mygemel.net" so nothing
   looks forged.

`assets/example-harel-negative.png` (Harel −0.07%) and `assets/example-meitav-positive.png`
(Meitav +0.10%) show exactly what a real mygemel.net card looks like — use them as the visual
reference for both live capture framing and any reproduction.

## Step 3 — Build the side-by-side comparison

Assemble one deliverable that shows both funds together and the calculation between them. Use
`assets/comparison-template.html` — an RTL, Karin-branded (navy/gold) layout that takes:

- The **negative** fund on one side (red actuarial balance) and the **positive** fund on the
  other (green), each as its card/screenshot with name, age track, איזון אקטוארי and סך נכסי המסלול.
- A **calculation banner** across the bottom (Step 4).

Render it to an image/PDF (or an artifact) so Karin can drop it straight into a proposal or send
it on WhatsApp. Keep the source screenshots visible — the red-vs-green contrast is the argument.

## Step 4 — The calculation (always include it)

Compute and show, in plain Hebrew:

1. **הפער באיזון האקטוארי** — the gap in percentage points:
   `gap = positive% − negative%`.
   Example: Meitav **+0.10%** vs Harel **−0.07%** → **פער של 0.17 נקודות אחוז** לטובת המנייד.
2. **המשמעות בשקלים על הצבירה** — apply each fund's balance to the client's accrued amount `B`:
   - השפעה בקרן הנוכחית (שלילית): `B × negative%`
   - השפעה בקרן היעד (חיובית): `B × positive%`
   - **הפרש מיידי לטובת המעבר:** `B × gap`
   - If Karin gave the client's balance, use it. If not, show the effect on a round anchor and
     say it scales linearly — e.g. on **₪300,000**: הראל ≈ **−₪210**, מיטב ≈ **+₪300**, פער ≈
     **~₪510**; and note "לכל ₪100,000 צבירה — פער של כ-₪170".
3. **One honest caveat line**, e.g.: "האיזון האקטוארי הוא מדד לתקופה אחת ומשתנה מרבעון לרבעון; זהו
   נתון תומך לצד תשואות ודמי ניהול, ולא הבטחה לרווח קבוע."

The math lives in `references/actuarial-balance-explainer.md` — read it if the client's fund pays
in an unusual structure or you're unsure how to phrase the shekel impact.

## Step 5 — Hand it back to Karin

Return, in one tidy message:

- The side-by-side comparison image/artifact (negative fund vs positive fund).
- The two-line calculation (gap in נקודות אחוז + shekel impact on the balance).
- The one caveat line.
- A short ready-to-paste Hebrew sentence Karin can drop into the recommendation, e.g.:
  > "בבדיקה ב-mygemel.net, האיזון האקטוארי של [קרן נוכחית] עומד על **[−X%]** (שלילי) לעומת
  > **[+Y%]** ב-[קרן היעד] באותו מסלול גיל — פער של [gap] נק' אחוז לטובת המעבר, כ-[₪] על הצבירה שלך."

## What "done" looks like

- Two funds on the **same age track**, negative vs positive, each shown from mygemel.net (live
  screenshot, Karin's screenshot, or a clearly-labeled faithful reproduction).
- A side-by-side visual Karin can paste into a proposal or send on WhatsApp.
- The gap computed in percentage points **and** in shekels on the client's balance.
- One honest caveat, so the recommendation stays professional and compliant.
