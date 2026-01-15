// === Firebase Configuration ===
//
// SETUP INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project (or use existing)
// 3. Go to Project Settings > General > Your apps
// 4. Click "Add app" and select Web (</>)
// 5. Register your app (no hosting needed)
// 6. Copy your config values below
// 7. Go to Realtime Database > Create Database
// 8. Start in TEST MODE for development
// 9. Deploy to GitHub Pages and enjoy!

window.firebaseConfig = {
    apiKey: "AIzaSyAUb9y0I5edaaEunQ04j7rOMDlbtTSuMLI",
    authDomain: "spinthewheel-3ff22.firebaseapp.com",
    databaseURL: "https://spinthewheel-3ff22-default-rtdb.firebaseio.com/",
    projectId: "spinthewheel-3ff22",
    storageBucket: "spinthewheel-3ff22.firebasestorage.app",
    messagingSenderId: "759704265022",
    appId: "1:759704265022:web:febe4454994d6db37b4c6f"
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
