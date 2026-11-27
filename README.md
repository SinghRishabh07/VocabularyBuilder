# VocabVault

A SvelteKit + Prisma (PostgreSQL) app for building and retaining vocabulary.

- **Lookup**: search a word (dictionaryapi.dev) and save it to your collection.
- **Analyze text** (`/analyze`): paste a paragraph; the app picks words worth learning,
  explains the sense used in context, and lets you save the ones you choose.
- **Revise** (`/revise`): spaced-repetition practice with flashcards, multiple choice
  (word → meaning, meaning → word) and fill-in-the-blank.
- **Progress**: streaks, goals, heatmap, level-ups.
- **Email** (Resend): welcome email on sign-up, "streak at risk" reminder via cron.

## Setup

```sh
npm install
cp .env.example .env        # fill in the values
npx prisma migrate deploy   # apply database migrations
npm run dev
```

See [.env.example](.env.example) for every environment variable.

## Paragraph analyzer

`POST /api/analyze` → [src/lib/server/analyzer/](src/lib/server/analyzer/)

- **Dictionary engine** (default, no key needed): filters basic words and transparent
  derivations, groups inflections, ranks by learning value, verifies with the dictionary,
  then picks the sense that fits the sentence (part-of-speech cues + rarity-weighted
  gloss overlap).
- **AI engine** (when `ANTHROPIC_API_KEY` is set): Claude selects the words and writes
  context-specific meanings. Falls back to the dictionary engine on any error.

Words already in the user's collection are never suggested. Saving goes through the same
`POST /api/words` path as Lookup (batch form: `{ words: [...] }`), which skips duplicates.

## Revision

Scheduling is a simplified SM-2 ([src/lib/server/srs.ts](src/lib/server/srs.ts)), with
fields stored on `Word` (`reviewDueAt`, `reviewInterval`, `reviewEase`, counts). Each
answer is persisted immediately (`POST /api/review/answer`, idempotent per session+word).
Sessions draw from: due words (most overdue / most missed first), then a few new words
(most recent first), then extra practice on the weakest words.

## Streak reminder cron

Call once per hour between 18:00 and 23:00 UTC:

```sh
curl -H "Authorization: Bearer $CRON_SECRET" https://your-app/api/cron/streak-risk
```

At most one reminder per user per UTC day (atomic claim + Resend idempotency key).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run check` | Type-check (svelte-check) |
| `npm run build` | Production build (adapter-node) |
| `node build` | Run the production build |
