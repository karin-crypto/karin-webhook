# 6. Database Entities

Full schema: [`prisma/schema.prisma`](../prisma/schema.prisma) (PostgreSQL via
Prisma). The model is **defined** in Phase 1 so future phases have a stable
foundation; tables are migrated as each capability is enabled.

## Entity map

```
Identity & access        Memberships & payments      AI conversations
─────────────────        ──────────────────────      ────────────────
User ─┬─ Account         Membership ─── Payment       Conversation ─── Message
      ├─ Session         (User 1─1 Membership)        (User 1─* Conversation)   │
      └─ Membership                                                            Citation
Organization ─* User                                                            │
                          Knowledge base              Courses & training        │
                          ──────────────              ──────────────────        │
                          KnowledgeDocument           Course ─── Lesson         │
                            └─ KnowledgeChunk ─────────  │         │            │
                                 └─ Citation ────────────┘   Enrollment         │
                                                              └─ LessonProgress │
Content                   Partners & inbound          Analytics
───────                   ──────────────────          ─────────
BlogPost                  Partner                     AnalyticsEvent
MediaAsset                ContactSubmission
```

## Entities by domain

### Identity & access
- **User** — core account. `role` (`MEMBER` / `INSTRUCTOR` / `ORG_ADMIN` /
  `STAFF`); optional `organizationId`.
- **Account** — provider-agnostic auth (OAuth/credentials).
- **Session** — server sessions.
- **Organization** — sailing schools, academies, charter/equipment companies,
  rescue orgs; owns `seats` for team memberships.

### Memberships & payments
- **Membership** — one per user; `tier` (`FREE`/`INDIVIDUAL`/`PROFESSIONAL`/
  `ORGANIZATION`), `status`, external customer id, period end.
- **Payment** — payment/invoice records linked to a membership.

### AI conversations
- **Conversation** — a session with KARINA; `channel` (`CHAT`/`VOICE`/`AVATAR`)
  so all three modes share one model.
- **Message** — `role` (`USER`/`KARINA`/`SYSTEM`) + content.
- **Citation** — links a message to the knowledge chunks that grounded it
  (provenance / trust).

### Knowledge base
- **KnowledgeDocument** — source material; `published` gate; tags.
- **KnowledgeChunk** — retrievable slice; `vectorId` references the external
  vector store (embeddings live there, canonical text lives here).

### Courses & training
- **Course** → **Lesson** — published learning content.
- **Enrollment** — a user in a course; **LessonProgress** — per-lesson
  completion.

### Content
- **BlogPost** — media/blog articles (`published`, `publishedAt`).
- **MediaAsset** — images/video/documents for the media library.

### Partners & inbound
- **Partner** — `approved` flag ensures **only confirmed partners are ever shown
  publicly** (no fabricated partners).
- **ContactSubmission** — inbound contact-form messages.

### Analytics
- **AnalyticsEvent** — lightweight, first-party events (name, path, props).

## Design notes

- **Trust & provenance are modeled, not bolted on:** `Citation` ties every AI
  answer back to sourced knowledge chunks.
- **Channel-agnostic conversations:** chat, voice, and avatar reuse
  `Conversation`/`Message`, so adding a channel is a value, not a new schema.
- **Privacy:** `Conversation.userId` and `AnalyticsEvent.userId` are optional —
  anonymous use is possible; cascade deletes remove a user's data with them.
- **Publish gates** (`published`, `approved`) keep unfinished/unverified content
  out of public view by default — aligned with the "no fake content" principle.
- **External stores referenced by id:** embeddings (vector DB) and payment
  objects live in their systems; Postgres keeps the canonical relational data.

## Migration plan

Entities are introduced per phase (see doc 7): auth/org (Phase 5), memberships/
payments (Phase 6), conversations/knowledge (Phase 3), courses (Phase 5),
content/analytics (Phase 7). Contact submissions land in Phase 2. Run
`npm run db:generate` / `db:push` against a `DATABASE_URL` when enabling each.
