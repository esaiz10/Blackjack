# Blackjack Capstone

A React Native casino app with Blackjack and Texas Hold'em Poker, built with Expo and Firebase.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Expo Go](https://expo.dev/go) app on your phone (optional, for mobile)

## Getting Started

1. **Clone the repo**
   ```bash
   git clone https://github.com/esaiz10/Blackjack.git
   cd Blackjack
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the app**

   - **Web (browser):**
     ```bash
     npm run web
     ```
     Then open [http://localhost:8081](http://localhost:8081)

   - **Mobile (iOS/Android):**
     ```bash
     npm start
     ```
     Scan the QR code with the Expo Go app on your phone.

## Features

- Blackjack vs AI dealer
- Texas Hold'em Poker vs AI
- Game history saved to Firebase
- Stats tracking with AsyncStorage
- Firebase Authentication (sign up / log in)
