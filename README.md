# Blackjack Capstone

Cross-platform casino app built with Expo + React Native.

Games:

- Blackjack vs AI dealer
- Texas Hold'em Poker (1 human vs 4 AI)

Backend/services:

- Firebase Authentication (email/password)
- Cloud Firestore for stats, history, and poker sessions

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Configure Firebase env vars:

```bash
cp .env.example .env
```

3. Run:

```bash
npm run web
# or
npm run android
npm run ios
```

## Scripts

```bash
npm test
npm run build
node scripts/pokerSim.js
```

## Full Technical Docs

See [DOCUMENTATION.md](./DOCUMENTATION.md) for architecture, frontend/backend details, Firestore schema, and deployment notes.
