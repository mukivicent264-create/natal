const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  projectId: "data-lightning-x6shk",
  appId: "1:284099646726:web:5fae92a69035bcf349fa87",
  apiKey: "AIzaSyAZOnh7Q_SNMFixtRoan6eQ-CEQLWIm7lY",
  authDomain: "data-lightning-x6shk.firebaseapp.com",
  storageBucket: "data-lightning-x6shk.firebasestorage.app",
  messagingSenderId: "284099646726"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-natalinteriordes-140ac38f-5cb8-448a-9690-3bb623514906");

async function test() {
  try {
    const querySnapshot = await getDocs(collection(db, 'projects'));
    console.log("Success! Docs count:", querySnapshot.size);
  } catch (e) {
    console.error("Error:", e.message);
  }
}
test();
