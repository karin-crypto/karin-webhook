# 7. Future AI Integration Plan

How KARINA becomes interactive — sequenced, with the seams already reserved in
the Phase 1 foundation. **Nothing here is built yet; this is the plan.**

## Guiding principles

1. **KARINA is always an AI character** — labelled clearly in every mode.
2. **Grounded, not guessed** — answers are retrieved from a maintained knowledge
   base and cite their sources (`Citation` entity).
3. **Modular layers** — one reasoning core; chat, voice, and avatar are
   swappable layers on top. Providers sit behind single modules in `lib/`.
4. **Safety-aware** — maritime safety is high-stakes; KARINA is clear about
   limits and never presents itself as a substitute for emergency services or
   certified human judgment.

## Capability roadmap

| Capability | Phase | Depends on | Seam already in place |
|------------|-------|-----------|-----------------------|
| Accounts & memberships | 5–6 | Auth, DB | `User`/`Membership` entities, `/account/*` routes reserved |
| Contact backend | 2 | DB | `ContactForm` markup, `ContactSubmission` entity |
| **AI chat** | 3 | Claude, KB | `AssistantLauncher`, `/ai-assistant`, `Conversation`/`Message`, `ANTHROPIC_API_KEY` |
| **Knowledge base** | 3 | Vector DB | `KnowledgeDocument`/`Chunk`/`Citation`, `VECTOR_DB_*` |
| **Voice conversation** | 4 | STT/TTS | `ConversationChannel.VOICE`, `VOICE_*` env |
| **Video avatar** | 4 | Avatar provider | `ConversationChannel.AVATAR`, `AVATAR_*` env |
| Course platform | 5 | Accounts, KB | `Course`/`Lesson`/`Enrollment`/`Progress`, `/learn/*` |
| Online payments | 6 | Accounts | `Membership`/`Payment`, `PAYMENTS_*`, `/api/webhooks` |
| Blog / media | 7 | Content source | `BlogPost`/`MediaAsset`, `/media` |
| Analytics | 7 | — | `AnalyticsEvent`, `NEXT_PUBLIC_ANALYTICS_ID` |
| CRM | 7 | Contact | `CRM_*` env, contact pipeline |

## The AI stack (Phases 3–4)

```
User (text | voice | avatar)
        │
        ▼
  Conversation orchestrator  (lib/ai) ── persists to Conversation/Message
        │
        ├── Retrieval ──► Vector DB ──► KnowledgeChunk(s)  → Citations
        │
        ▼
  Claude (reasoning core)  ── grounded prompt + retrieved context
        │
        ├── text  ─────────────────────────► Chat UI (stream)
        ├── text ─► TTS ─► audio ──────────► Voice UI
        └── text ─► TTS ─► audio ─► Avatar ─► Avatar stage (video)
```

### Phase 3 — Chat + knowledge base
- Build `lib/ai/` (Claude client, prompt templates, retrieval) and `lib/db.ts`.
- Ingest pipeline: `KnowledgeDocument` → chunk → embed → vector store.
- `/api/chat` streaming route; `AssistantLauncher` becomes a client panel.
- Every answer records `Citation`s for provenance and trust.
- Guardrails: refusal/limits copy, safety disclaimers, rate limiting.

### Phase 4 — Voice + avatar
- Add STT (speech → text) and TTS (text → speech) behind `lib/ai/voice`.
- Add avatar streaming behind `lib/ai/avatar`; reuse the same orchestrator.
- Channel is just a `ConversationChannel` value — no schema change needed.

## Model & provider choices

- **Reasoning core:** Anthropic Claude (default `KARINA_MODEL`, e.g. a current
  Claude model). Isolated in `lib/ai` so it can be tuned or swapped.
- **Retrieval:** external vector store (provider-agnostic via `VECTOR_DB_*`).
- **Voice / avatar:** provider-agnostic via env; chosen during Phase 4.

## Safety, privacy & trust

- **Transparency:** persistent "AI character" labelling (see `AiBadge`).
- **Provenance:** answers cite sources; unsupported questions are declined
  rather than fabricated.
- **Data minimization:** anonymous conversations allowed; user linkage optional;
  cascade deletes honor account removal.
- **Human-in-the-loop:** clear escalation language for real emergencies; KARINA
  never claims to replace certified professionals or rescue services.
- **Abuse controls:** rate limiting and input validation on all AI endpoints.

## Definition of done per capability

A capability is "live" only when: the seam is wired, data flows through the real
entity, guardrails/limits are in place, it is accessible (a11y), and it is
truthful (no fabricated content or claims). Until then the UI shows an honest
*Roadmap* note.

---

**Phase 1 stops here.** Implementation of Phase 2+ awaits approval.
