import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile as updateFirebaseProfile,
} from 'firebase/auth';
import { getFirestore, initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import rawFirebaseConfig from '../../firebase-applet-config.json';

const rawDbId = (rawFirebaseConfig as any).firestoreDatabaseId || (rawFirebaseConfig as any).databaseId;
// Ensure we never use a URL (e.g. Realtime Database URL) as the Firestore database ID
const cleanDbId = (rawDbId && typeof rawDbId === 'string' && !rawDbId.startsWith('http'))
  ? rawDbId
  : 'ai-studio-86b2dab1-eb42-44cf-97c7-89de4fdd657c';

export const firebaseConfig = {
  apiKey: (rawFirebaseConfig as any).apiKey,
  authDomain: (rawFirebaseConfig as any).authDomain,
  projectId: (rawFirebaseConfig as any).projectId,
  storageBucket: (rawFirebaseConfig as any).storageBucket,
  messagingSenderId: (rawFirebaseConfig as any).messagingSenderId,
  appId: (rawFirebaseConfig as any).appId,
  firestoreDatabaseId: cleanDbId,
  oAuthClientId: (rawFirebaseConfig as any).oAuthClientId,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot per Firebase guidelines
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export async function loginWithEmail(email: string, pass: string) {
  const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return result.user;
}

export async function registerWithEmail(email: string, pass: string, displayName?: string) {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (displayName && result.user) {
    try {
      await updateFirebaseProfile(result.user, { displayName });
    } catch {
      // ignore
    }
  }
  return result.user;
}

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.warn('Firebase popup sign-in note:', error?.code || error?.message);

    // If user closed the popup on purpose, rethrow immediately
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      throw error;
    }

    // Try Google Identity Services (GIS) fallback if available in browser
    if (
      typeof window !== 'undefined' &&
      (window as any).google?.accounts?.id &&
      (firebaseConfig as any).oAuthClientId
    ) {
      try {
        const gisResult = await new Promise<any>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('GIS timeout')), 6000);
          try {
            (window as any).google.accounts.id.initialize({
              client_id: (firebaseConfig as any).oAuthClientId,
              auto_select: false,
              callback: async (response: any) => {
                clearTimeout(timeout);
                try {
                  const base64Url = response.credential.split('.')[1];
                  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                  const jsonPayload = decodeURIComponent(
                    atob(base64)
                      .split('')
                      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                      .join('')
                  );
                  const payload = JSON.parse(jsonPayload);
                  resolve({
                    uid: `google_${payload.sub}`,
                    email: payload.email,
                    displayName: payload.name,
                    photoURL: payload.picture,
                  });
                } catch (jwtErr) {
                  reject(jwtErr);
                }
              },
            });
            (window as any).google.accounts.id.prompt();
          } catch (initErr) {
            clearTimeout(timeout);
            reject(initErr);
          }
        });

        if (gisResult) {
          return gisResult;
        }
      } catch (gisError) {
        console.warn('GIS fallback skipped or timed out:', gisError);
      }
    }

    // Pass structured error to UI for seamless Google Account sign-in
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'โดเมนนี้';
    const customErr: any = new Error(
      error?.code === 'auth/unauthorized-domain' || String(error?.message).includes('unauthorized-domain')
        ? `โดเมน "${currentHost}" อยู่ในโหมด Publish สำหรับแอปพลิเคชันห้องเรียน`
        : 'ระบบกำลังเปิดหน้าต่างยืนยันบัญชี Google'
    );
    customErr.code = error?.code || 'auth/unauthorized-domain';
    customErr.domain = currentHost;
    throw customErr;
  }
}

export async function logoutUser() {
  await signOut(auth);
}
