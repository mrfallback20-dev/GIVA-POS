import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInAnonymously, type Auth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/**
 * Firestore with a persistent on-device cache (IndexedDB):
 *  - the app opens and keeps selling with no signal
 *  - sales / stock changes made offline are queued and uploaded automatically
 *    when ANY connection (Wi-Fi or mobile data) comes back
 *  - auto long-polling fallback keeps sync working on mobile carriers / proxies
 *    that block WebSocket/WebChannel streaming
 */
function createDb(): Firestore {
  const databaseId = firebaseConfig.firestoreDatabaseId || undefined;
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
        experimentalAutoDetectLongPolling: true,
      },
      databaseId
    );
  } catch (err) {
    // Already initialised (hot reload) or IndexedDB unavailable (private mode)
    console.warn('[Firebase] Using default Firestore instance:', err);
    return databaseId ? getFirestore(app, databaseId) : getFirestore(app);
  }
}

export const db = createDb();
export const auth: Auth = getAuth(app);

let authPromise: Promise<void> | null = null;

/**
 * Anonymous sign-in so Firestore rules can require `request.auth != null`
 * (the database is no longer world-writable). Safe to call repeatedly and
 * works offline once the device has signed in once (session persists).
 */
export function ensureAuth(): Promise<void> {
  if (authPromise) return authPromise;
  authPromise = new Promise<void>((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsub();
        resolve();
      } else {
        signInAnonymously(auth).catch((err) => {
          console.warn('[Firebase] Anonymous sign-in failed (offline or provider disabled):', err?.code || err);
          // Resolve anyway: cached data still works; writes queue until auth succeeds.
          authPromise = null;
          resolve();
        });
      }
    });
  });
  return authPromise;
}

export default app;
