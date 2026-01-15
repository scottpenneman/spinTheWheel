# Spin The Wheel

A game night decision maker. Create a room, add games to the wheel, and spin to decide what to play.

## Features

- Create/join rooms with shareable codes
- Real-time sync across all players via Firebase
- Add games to the wheel (2 suggestions per person)
- Spin to randomly pick tonight's game

## Setup

1. Create a Firebase project at https://console.firebase.google.com/
2. Add a web app and copy your config values into `firebase-config.js`
3. Create a Realtime Database in test mode
4. Deploy to GitHub Pages or any static host

## About the Firebase Config

The Firebase configuration in `firebase-config.js` is intentionally committed to this repository. These values are **not secret** — they're designed to be public in client-side web apps.

Firebase web config values only identify your project; they don't grant access. Security is enforced by [Firebase Security Rules](https://firebase.google.com/docs/database/security), not by hiding these credentials. Anyone using the app can see them in browser dev tools anyway.

For more info, see [Firebase's documentation on API key usage](https://firebase.google.com/docs/projects/api-keys).
