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
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import rawFirebaseConfig from '../../firebase-applet-config.json';

const metaEnv = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || (rawFirebaseConfig as any).apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || (rawFirebaseConfig as any).authDomain,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || (rawFirebaseConfig as any).projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || (rawFirebaseConfig as any).storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || (rawFirebaseConfig as any).messagingSenderId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || (rawFirebaseConfig as any).appId,
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_DATABASE_ID || (rawFirebaseConfig as any).firestoreDatabaseId,
  oAuthClientId: metaEnv.VITE_GOOGLE_CLIENT_ID || (rawFirebaseConfig as any).oAuthClientId,
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

    // Specific detection and actionable guidance for unauthorized-domain (common on GitHub Pages)
    if (error?.code === 'auth/unauthorized-domain' || String(error?.message).includes('unauthorized-domain')) {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'โดเมนนี้';
      const customErr: any = new Error(
        `โดเมน "${currentHost}" ยังไม่ได้รับอนุญาตใน Firebase Authentication\n` +
        `กรุณาไปที่ Firebase Console > Authentication > Settings > Authorized domains แล้วเพิ่ม "${currentHost}"\n` +
        `หรือสามารถเข้าสู่ระบบด้วยอีเมลและรหัสผ่านของโรงเรียนไทยนิยมสงเคราะห์ได้ทันที`
      );
      customErr.code = 'auth/unauthorized-domain';
      customErr.domain = currentHost;
      throw customErr;
    }

    // If popup was blocked by browser, try redirect
    if (error?.code === 'auth/popup-blocked') {
      try {
        await signInWithRedirect(auth, googleProvider);
        return null;
      } catch (redirectErr) {
        console.warn('Redirect sign-in notice:', redirectErr);
      }
    }

    // Try Google Identity Services (GIS) fallback if available in browser
    if (
      typeof window !== 'undefined' &&
      (window as any).google?.accounts?.id &&
      (firebaseConfig as any).oAuthClientId
    ) {
      try {
        const gisResult = await new Promise<any>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('GIS timeout')), 8000);
          try {
            (window as any).google.accounts.id.initialize({
              client_id: (firebaseConfig as any).oAuthClientId,
              auto_select: false,
              callback: async (response: any) => {
                clearTimeout(timeout);
                try {
                  const credential = GoogleAuthProvider.credential(response.credential);
                  const credResult = await signInWithCredential(auth, credential);
                  resolve(credResult.user);
                } catch {
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

    throw error;
  }
}

export async function logoutUser() {
  await signOut(auth);
}
