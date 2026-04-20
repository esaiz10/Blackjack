# BlackjackCapStone Documentation

## 1. Overview

BlackjackCapStone is a multi-game casino app built with Expo + React Native.
It includes:

- Blackjack (single player vs AI dealer)
- Texas Hold'em Poker (1 human vs 4 AI players)
- Firebase Authentication
- Firestore-backed stats and game history
- Cross-platform runtime: iOS, Android, and Web

## 2. Frameworks and Stack

### Frontend

- React `19.1.0`
- React Native `0.81.5`
- Expo `~54.0.31`
- react-native-web `^0.21.0`
- react-native-safe-area-context `~5.6.0`
- expo-status-bar `~3.0.9`
- @expo/metro-runtime `~6.1.2`

### Backend / Data Services

- Firebase JS SDK `^12.8.0`
  - Firebase Authentication (email/password)
  - Cloud Firestore (stats, history, poker session data)
- AsyncStorage `2.2.0`
  - Used for auth persistence on native via Firebase Auth persistence adapter

### Testing and Tooling

- Jest `~29.7.0`
- jest-expo `~54.0.17`
- @testing-library/react-native `^13.3.3`
- @testing-library/jest-native `^5.4.3`
- TypeScript config present (`tsconfig.json`)

## 3. Application Architecture

The app uses state-based screen routing in `App.js` (no React Navigation).

Screen flow:

- `login` (implicit when `user == null`)
- `welcome`
- `gameSelect`
- `game` (Blackjack)
- `poker` (Texas Hold'em)
- `stats`
- `history`

Core app responsibilities in `App.js`:

- Subscribe to `onAuthStateChanged(auth, ...)`
- Preload card images with `expo-asset`
- Gate screen rendering until auth and assets are ready
- Wrap content in `SafeAreaProvider`
- Apply constrained center column layout for web (`maxWidth: 480`)

## 4. Project Structure

```txt
BlackjackCapStone/
├── App.js
├── index.js
├── firebaseConfig.js
├── .env.example
├── README.md
├── DOCUMENTATION.md
├── screens/
│   ├── LoginScreen.js
│   ├── welcomeScreen.js
│   ├── GameSelectScreen.js
│   ├── GameScreen.js
│   ├── PokerScreen.js
│   ├── statScreen.js
│   └── historyScreen.js
├── components/
│   ├── deck.js
│   ├── cardImages.js
│   ├── aiPlayer.js
│   ├── pokerAI.js
│   ├── pokerHandEvaluator.js
│   ├── FadeInView.js
│   └── BackgroundLayers.js
├── styles/
│   ├── theme.js
│   └── GameStyles.js
├── scripts/
│   └── pokerSim.js
└── __test__/
    └── GameScreen.test.tsx
```

## 5. Frontend Documentation

### 5.1 Auth and Session Handling

Files:

- `firebaseConfig.js`
- `screens/LoginScreen.js`
- `App.js`

Behavior:

- Users register/login via email and password.
- `initializeAuth` uses platform-specific persistence:
  - Web: `browserLocalPersistence`
  - Native: `getReactNativePersistence(AsyncStorage)`
- Auth state survives app restarts.

### 5.2 UI Screens

#### `LoginScreen`

- Toggle between login and register modes.
- Registration validation:
  - Name required
  - Email required
  - Minimum password length 6
  - Password confirmation match

#### `welcomeScreen`

- Branded main menu with actions:
  - Play Games
  - Statistics
  - History
  - Sign Out

#### `GameSelectScreen`

- Lets user choose Blackjack or Poker.

#### `GameScreen` (Blackjack)

Implements a betting round model with phases:

- `betting`
- `insurance`
- `player`
- `dealer`
- `done`

Supported gameplay features:

- Min bet enforcement (`$10`)
- Bankroll tracking (starts at `1000`)
- Hit / Stand / Double
- Split (single split, when first two cards match rank)
- Insurance flow when dealer up-card is Ace
- Dealer hidden hole card while player acts
- Per-hand resolution with win/loss/push/bust
- Firestore persistence for outcomes and hand history

Dealer AI rule behavior (`components/aiPlayer.js`):

- Hits on soft 17 or lower
- Stands on hard 17+
- For hard 12-16, may stand if already ahead of player

#### `PokerScreen` (Texas Hold'em)

Game setup:

- 5 seats: 1 human + 4 AI
- Starting stack: `1000`
- Blinds: SB `10`, BB `20`
- Streets: preflop, flop, turn, river, showdown

Major features:

- Betting actions: check, call, raise, fold
- Human bet slider with 5-chip increments
- Turn order logic (preflop/postflop)
- Pot handling and street betting reset
- Hand evaluation with showdown comparison
- Session tracking (`pokerGames`) and per-hand records (`pokerGames/{id}/hands`)
- Result roll-up into global `games` and `stats`

#### `statScreen`

- Reads `stats/{uid}` from Firestore.
- Displays separate Blackjack and Poker metrics.
- Supports reset of all stats back to zero.

#### `historyScreen`

- Reads last 100 rows from `games` for current user.
- Preferred query uses `where(userId) + orderBy(playedAt desc)`.
- Includes fallback client-side sort when composite index is missing.

### 5.3 UI/UX Components

- `BackgroundLayers`: decorative visual layers (casino-style atmosphere)
- `FadeInView`: staggered entrance animation
- `cardImages`: maps card code (`AS`, `10H`, etc.) to local PNG assets
- Shared theme via `styles/theme.js`

## 6. Backend Documentation

## 6.1 Firebase Configuration

`firebaseConfig.js` initializes:

- Firebase App
- Firebase Auth with persistence
- Cloud Firestore

All Firebase credentials are sourced from `EXPO_PUBLIC_FIREBASE_*` environment variables.

## 6.2 Firestore Collections

### `stats/{userId}`

Aggregated counters:

```json
{
  "blackjack": { "wins": 0, "losses": 0 },
  "poker": { "wins": 0, "losses": 0, "ties": 0 }
}
```

### `games`

One document per completed Blackjack hand or Poker hand result summary:

```json
{
  "userId": "uid",
  "gameType": "blackjack | poker",
  "result": "win | loss | push | bust | tie",
  "playerScore": 20,
  "dealerScore": 18,
  "playerHand": ["AS", "9H"],
  "dealerHand": ["10D", "8C"],
  "playedAt": "serverTimestamp"
}
```

Blackjack records may also include:

- `bet`
- `handIndex`
- `isSplit`
- `payout`

### `pokerGames`

One document per poker session started when entering poker table:

```json
{
  "userId": "uid",
  "startedAt": "serverTimestamp",
  "endedAt": "serverTimestamp | null",
  "handsPlayed": 0,
  "wins": 0,
  "losses": 0,
  "ties": 0,
  "startStack": 1000,
  "finalStack": null,
  "netChips": null
}
```

### `pokerGames/{gameId}/hands`

One document per poker hand inside a session:

- Hand number and timestamp
- Result (`win/loss/tie`)
- Pot, player stack, net chips
- Player cards + community cards
- End reason (`showdown`/`fold`)
- Street-by-street action logs

## 6.3 Auth + Data Security Notes

Recommended Firestore rules:

- Restrict reads/writes to authenticated users.
- Restrict `stats` and session data to matching `request.auth.uid`.
- Validate expected schema fields for `games` and `pokerGames` writes.

## 7. Core Game Logic

### 7.1 Deck and Card Model

`components/deck.js`

- Builds standard 52-card deck
- Shuffles with Fisher-Yates
- Deals via array slicing

Card encoding:

- Value: `A`, `2`-`10`, `J`, `Q`, `K`
- Suit: `S`, `H`, `D`, `C`
- Example: `AS`, `10D`, `KC`

### 7.2 Blackjack AI

`components/aiPlayer.js`

- Exposes dealer decision function used in gameplay.
- Evaluates hand totals with Ace soft/hard handling.

### 7.3 Poker AI

`components/pokerAI.js`

- Classifies strength into tiers:
  - `weak`
  - `weak_medium`
  - `medium`
  - `medium_strong`
  - `strong`
  - `very_strong`
- Uses:
  - Pot odds (`aiToCall / (pot + aiToCall)`)
  - Position looseness preflop (late seats)
  - Small bluff and trap frequencies
  - Draw detection (flush/straight)

### 7.4 Poker Hand Evaluation

`components/pokerHandEvaluator.js`

- Evaluates best 5-card hand from 5-7 cards.
- Supports ranking from High Card to Straight Flush.
- Uses tiebreaker arrays for deterministic comparisons.

## 8. Setup and Run

## 8.1 Prerequisites

- Node.js 18+
- npm
- Expo environment (Expo Go optional for device testing)

## 8.2 Environment Variables

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Populate:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID`

## 8.3 Commands

```bash
npm install
npm run web
npm run android
npm run ios
npm test
npm run build
```

## 9. Deployment

Web export uses Expo static export and is configured for Vercel (`vercel.json`):

- Build command: `npm run build`
- Output directory: `dist`

## 10. Testing Coverage

Current automated tests include a baseline render test for Blackjack screen UI.

Testing gap areas:

- Blackjack payouts and split/insurance edge cases
- Poker betting flow and side-pot behavior
- Firestore write path tests (mocked integration)

## 11. Simulation Script

`scripts/pokerSim.js` runs headless AI self-play for strategy tuning.

Run:

```bash
node scripts/pokerSim.js
```

## 12. Known Limitations / Next Improvements

1. No React Navigation; screen routing is manual state switching.
2. Firestore schema is implicit (no typed model validation layer).
3. Limited unit/integration test coverage for game engines.
4. No server-authoritative anti-cheat model (client writes game results).
5. No backend worker or API layer for analytics/leaderboards.

