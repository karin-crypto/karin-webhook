---
name: karin-keren-management-fees
description: >
  Karin's workflow for stating the management fee (דמי ניהול) a client would pay after a transfer.
  Use this skill WHENEVER Karin recommends a ניוד / consolidation / moving of savings (המלצה על ניוד,
  איחוד חסכונות, ריכוז כספים, "לנייד ל...", "לרכז את החסכונות") — compute the insured's TOTAL existing
  accumulation (סך הצבירה) across all their relevant funds, find the matching tier in the verified fee
  schedule, and state the resulting management fee at the destination company (currently Clal / כלל —
  חיסכון פיננסי). Trigger even if Karin doesn't ask for the fee explicitly — stating the post-transfer
  management fee is the expected companion to a transfer recommendation. Use ONLY the verified fee
  schedule in references/fee-schedules.md; never invent a rate. If the client's product family or the
  accumulation isn't covered by a verified schedule, say so rather than guessing.
---

# Post-Transfer Management Fee

When Karin recommends moving or consolidating a client's savings, this skill answers "what will the
management fee be?" — by summing the client's **total accumulation** and reading the fee off the
verified tier schedule (fees are tiered by accumulation size, so consolidation into one larger
balance usually earns a lower rate — which is often the point of the recommendation).

## Step 1 — Sum the total accumulation (סך הצבירה)

From the portfolio analysis / recommendation / meeting summary, add up the client's **accumulated
balances (צבירה)** across the relevant funds being consolidated. Be explicit about:

- Which balances you included (list them), and the **total**.
- The **product family** — the Clal schedule below is for **חיסכון פיננסי** (קופת גמל להשקעה /
  פוליסת חיסכון). Don't apply it to pension/hishtalmut unless a schedule for those is verified.
- If some balances are unknown, state the total is partial and which figure is missing.

## Step 2 — Read the fee off the verified schedule

Open `references/fee-schedules.md`, pick the institution + product, and find the tier the **total
accumulation** falls into → that's the **דמי ניהול מצבירה**. If there are ongoing monthly deposits,
also read the הפקדה שוטפת rate by deposit size. Use only verified rows; if the tier or product isn't
there, report it as missing.

## Step 3 — State it clearly

Return, in plain Hebrew:

- **סך צבירה כוללת:** ₪X (with the list of balances summed).
- **מדרגה ודמי ניהול:** "לפי צבירה של ₪X → דמי ניהול בכלל (חיסכון פיננסי): **Y%** מצבירה."
- If relevant, the **הפקדה שוטפת** rate for the monthly deposit.
- If the recommendation consolidates several funds, note the fee is set by the **combined** balance
  (e.g. two ₪60k funds separately would each be ~0.90%, but ₪120k together drops to **0.85%**).
- **Caveat line:** "דמי הניהול נתונים למשא ומתן ולתנאי ההצעה בפועל; השיעורים לפי מדרגות כלל לחיסכון
  פיננסי נכון למקור שסופק — יש לאמת מול כלל לפני החתימה."

## What "done" looks like

- The client's total accumulation summed from real balances (with the list shown, and any missing
  balance flagged).
- The management fee read from the **verified** tier schedule — never invented — with the tier stated.
- The consolidation effect noted when several funds are merged.
- One caveat that fees are subject to the final offer, plus a note if the product family isn't covered.
