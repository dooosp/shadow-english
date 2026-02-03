# shadow-english

YouTube subtitle-based English shadowing app with contextual vocabulary analysis and spaced repetition.

**Zero LLM** — NLP powered by compromise.js, vocabulary mapped to CEFR levels.

## Features

- **Shadowing**: Play YouTube videos with synchronized subtitle highlighting
- **Vocab Analysis**: Extract words from subtitles, classify by CEFR level (A1–C2)
- **Contextual Wordbook**: See words in their original sentence context
- **SRS Review**: SM-2 spaced repetition algorithm for vocabulary retention

## Architecture

```
Express server (:3004)
  ├─ subtitle-extractor  → YouTube subtitle fetch
  ├─ subtitle-parser     → WebVTT parsing + timing
  ├─ vocab-analyzer      → compromise.js NLP + CEFR mapping
  ├─ srs-engine          → SM-2 algorithm (interval/easiness/repetition)
  ├─ dictionary          → word lookup service
  └─ data-store          → JSON persistence

public/
  ├─ shadowing.js   → video player + subtitle sync
  ├─ wordbook.js    → vocabulary browser
  ├─ review.js      → SRS flashcard UI
  └─ app.js         → routing + state
```

## Stack

- **Runtime**: Node.js + Express
- **NLP**: compromise (tokenization, POS tagging, lemmatization)
- **Subtitles**: node-webvtt
- **Data**: CEFR wordlist (A1–C2), JSON file storage
- **Algorithm**: SM-2 spaced repetition

## Setup

```bash
cp .env.example .env
npm install
npm start              # http://localhost:3004
npm run build-cefr     # Rebuild CEFR wordlist
```
