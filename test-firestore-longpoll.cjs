const { initializeApp } = require('firebase/app');
const { initializeFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  projectId: "data-lightning-x6shk",
  appId: "1:284099646726:web:5fae92a69035bcf349fa87",
  apiKey: "AIzaSyAZOnh7Q_SNMFixtRoan6eQ-CEQLWIm7lY",
  authDomain: "data-lightning-x6shk.firebaseapp.com",
  storageBucket: "data-lightning-x6shk.firebasestorage.app",
  messagingSenderId: "284099646726"
};

const app = initializeApp(firebaseConfig);
try {
  const db = initializeFirestore(app, {
    experimentalForceLongPolling: true
  }, "ai-studio-natalinteriordes-140ac38f-5cb8-448a-9690-3bb623514906");
  
  async function test() {
    const querySnapshot = await getDocs(collection(db, 'projects'));
    console.log("Success with long polling! Docs count:", querySnapshot.size);
    process.exit(0);
  }
  test();
} catch (e) {
  console.error("Initialization error:", e);
  process.exit(1);
}
