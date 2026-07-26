# Karin Keren — custom Claude skills

Version-controlled copies of Karin's personal Claude skills. These are the durable source of
truth; the live copies run from `~/.claude/skills/` in each session.

## Skills

- **`karin-keren-actuarial-balance-comparison/`** — when Karin recommends transferring a pension
  fund and notes a negative actuarial balance (איזון אקטוארי שלילי), produces a side-by-side
  mygemel.net comparison of the negative fund vs a positive-balance fund on the same age track,
  and computes the gap and its shekel impact on the client's balance.

## Installing / updating a live skill

Copy the skill folder into the Claude skills directory so it triggers in sessions:

```bash
cp -r skills/karin-keren-actuarial-balance-comparison ~/.claude/skills/
```

The skill activates automatically from its `SKILL.md` front-matter `description` — no manifest
edit is required for it to be discovered.
