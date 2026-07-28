# Karin Keren — custom Claude skills

Version-controlled copies of Karin's personal Claude skills. These are the durable source of
truth; the live copies run from `~/.claude/skills/` in each session.

## Skills

- **`karin-keren-actuarial-balance-comparison/`** — when Karin recommends transferring a pension
  fund and notes a negative actuarial balance (איזון אקטוארי שלילי), produces a side-by-side
  mygemel.net comparison of the negative fund vs a positive-balance fund on the same age track,
  and computes the gap and its shekel impact on the client's balance.
- **`karin-keren-management-fees/`** — when Karin recommends a ניוד / consolidation, sums the
  client's total accumulation and states the resulting management fee at the destination company
  (Clal financial-savings tiers) from a verified fee schedule. Never invents a rate.
- **`karin-keren-deposit-execution-details/`** — when Karin notes in a recommendation or meeting
  summary that a transfer/deposit to an investment house or insurance company is needed, produces a
  ready-to-execute "פרטים לביצוע הפקדה" block from a verified institutions reference (bank transfer
  and/or masav) merged with the client's product, amount and reference. Never invents account
  details — reads only verified values from `references/institutions.md`.

## Installing / updating a live skill

Copy the skill folder into the Claude skills directory so it triggers in sessions:

```bash
cp -r skills/karin-keren-actuarial-balance-comparison ~/.claude/skills/
```

The skill activates automatically from its `SKILL.md` front-matter `description` — no manifest
edit is required for it to be discovered.
