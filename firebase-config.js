// === Firebase Configuration ===
//
// SETUP INSTRUCTIONS:
// 1. Copy this file: cp firebase-config.example.js firebase-config.js
// 2. Go to https://console.firebase.google.com/
// 3. Create a new project (or use existing)
// 4. Go to Project Settings > General > Your apps
// 5. Click "Add app" and select Web (</>)
// 6. Register your app (no hosting needed)
// 7. Copy your config values into firebase-config.js
// 8. Go to Realtime Database > Create Database
// 9. Start in TEST MODE for development
// 10. Deploy and enjoy!
//
// NOTE: firebase-config.js is gitignored to keep your credentials out of version control.

window.firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// ============================================
// IMPORTANT: Database Rules
// ============================================
// For production, update your Firebase Realtime Database rules.
// Go to: Realtime Database > Rules
//
// Recommended rules for this app:
/*
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true,
        "games": {
          "$gameId": {
            ".validate": "newData.hasChildren(['name', 'addedBy', 'timestamp'])"
          }
        }
      }
    }
  }
}
*/
//
// For even more security, you can add rate limiting and
// validation rules. The above rules allow anyone to read/write
// to rooms, which is fine for a trusted friend group.
// ============================================
