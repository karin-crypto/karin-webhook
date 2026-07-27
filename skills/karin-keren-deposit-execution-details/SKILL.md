---
name: karin-keren-deposit-execution-details
description: >
  Karin's workflow for auto-producing ready-to-execute deposit/transfer details. Use this skill
  WHENEVER Karin, inside a recommendation or a meeting summary (המלצה / סיכום פגישה / סיכום שיחה),
  writes that a transfer or a deposit needs to be made to an investment house (בית השקעות) or an
  insurance company (חברת ביטוח) — phrasings like "צריך להעביר", "לבצע הפקדה", "להפקיד ל...",
  "להעביר כספים ל...", "העברה ל[מיטב/מור/אלטשולר/הראל/כלל/מגדל/מנורה/הפניקס...]", "לפתוח הוראת קבע ל...".
  When triggered, build a clean "פרטים לביצוע הפקדה" block: the institution's VERIFIED deposit
  details (beneficiary/bank/branch/account or masav institution code) from the reference file,
  merged with the client-specific fields (name, ת.ז, product, purpose, amount, reference number).
  Trigger even if Karin does not explicitly ask for "the details" — producing the execution block
  is the expected next step whenever a deposit/transfer to an institution is noted. Do NOT invent
  any bank account number, מוסד code, or beneficiary — use only values present in the verified
  reference; if they're missing, say so and ask Karin to add them. Do NOT use this for fund-to-fund
  ניוד via מסלקה (that goes through transfer forms, not a deposit block).
---

# Deposit / Transfer Execution Details

When a recommendation or a meeting summary says money needs to move to an investment house or an
insurance company, this skill turns that line into a ready-to-send **"פרטים לביצוע הפקדה"** block —
so Karin (or the client) can execute the bank transfer / standing order without hunting for the
institution's details each time.

> ⚠️ **Money-movement safety — read first.** Bank account numbers, מוסד (masav) codes and
> beneficiary names come **only** from the verified reference `references/institutions.md`. Never
> guess, autocomplete, or infer them from memory. If the institution (or a needed field) is not in
> the verified reference, stop and tell Karin exactly what's missing — do not produce a block with a
> placeholder that could be mistaken for a real account. Every block ends with an אימות line.

## Step 1 — Read the request

From the recommendation / meeting summary, extract:

- **Institution** — the בית השקעות / חברת ביטוח receiving the money (e.g. מיטב, מור, אלטשולר שחם,
  הראל, כלל, מגדל, מנורה מבטחים, הפניקס).
- **Client** — full name + **ת.ז**.
- **Product** — גמל / השתלמות / פנסיה / פוליסת חיסכון / קרן נאמנות, and the **purpose/ייעוד**
  (תגמולים / פיצויים / הפקדה חד-פעמית / הפקדה חודשית).
- **Amount** and **frequency** (חד-פעמי / חודשי).
- **Reference / policy** — existing policy / account / fund number if there is one.
- **Method** — bank transfer, or masav/הוראת תשלום (standing order). If unstated, default to bank
  transfer and note that a הרשאה can be set up instead.

If the institution or the amount is missing/ambiguous, ask Karin one short question before building.

## Step 2 — Look up the institution's verified deposit details

Open `references/institutions.md` and find the row for the institution. It holds the verified:
beneficiary (שם המוטב לחשבון), bank, branch, account number, masav מוסד code, the **reference the
institution requires** on the deposit (e.g. ת.ז + מספר פוליסה), and notes.

- Match by institution name; if an institution runs different accounts per product (e.g. גמל vs
  פנסיה vs ביטוח), pick the row for the right product.
- If the row (or a field you need for the chosen method) is blank / marked "— (לאימות)", **do not
  fabricate it** — report it as missing and ask Karin to fill it.

## Step 3 — Build the block

Fill `assets/deposit-block-template.md`, keeping only the method section(s) that apply:

- **העברה בנקאית** — מוטב, בנק, סניף, מספר חשבון, והאסמכתא לציון בהעברה (ת.ז הלקוח + מס' פוליסה/חשבון).
- **הרשאה / הוראת תשלום (מסב)** — קוד מוסד, מזהה משלם/אסמכתא, סכום ומועד חיוב.
- **פרטי המוצר וההפקדה** — always include: מוסד, מוצר, ייעוד, סכום, תדירות (so the deposit is credited
  to the right product and purpose).

## Step 4 — Hand it back

Return one tidy message with:

- The filled **פרטים לביצוע הפקדה** block (ready to paste into WhatsApp / an email to the client or
  to operations).
- The **אימות לפני ביצוע** line: confirm beneficiary name, account number and reference against the
  institution's official deposit instructions before sending money.
- If anything was missing from the reference, a clear note of what Karin needs to add.

## What "done" looks like

- A deposit block whose bank/מוסד details came **verbatim** from the verified reference — nothing
  invented.
- Client, product, purpose, amount and reference filled from the recommendation / meeting summary.
- The right method section(s) shown (bank transfer and/or masav), plus the product-and-deposit lines.
- An אימות line, and an explicit list of any missing fields.
