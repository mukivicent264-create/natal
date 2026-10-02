import { initializeApp } from 'firebase/app';
import { initializeFirestore, setLogLevel, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Silence internal SDK connection retry warnings in container/iframe sandbox environments
setLogLevel('silent');

// Use initializeFirestore with auto-detect long polling so real mobile devices use native fast WebChannel streams
// and fallback automatically to long polling only if an iframe sandbox or proxy restricts it
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || "ai-studio-natalinteriordes-140ac38f-5cb8-448a-9690-3bb623514906");

export const auth = getAuth(app);
export const databaseId = firebaseConfig.firestoreDatabaseId;
export const projectId = firebaseConfig.projectId;

// Validate connection to Firestore on initialization
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, '_connection_test', 'status'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore connection check: Client is offline or sandbox network restricted.");
      return false;
    }
    return true;
  }
}
testConnection();

