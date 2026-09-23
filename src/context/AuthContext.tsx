import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, googleProvider, OperationType, handleFirestoreError } from '../utils/firebase';
import { getDeviceFingerprint } from '../utils/deviceFingerprint';

export interface UserTokenProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  tokensUsedToday: number;
  dailyLimit: number;
  lastResetDate: string;
  totalTokensUsed: number;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserTokenProfile | null;
  loading: boolean;
  isAuthPending: boolean;
  authError: string | null;
  deviceId: string;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  checkHasQuota: (estimatedTokens?: number) => boolean;
  recordTokenUsage: (amount: number) => Promise<boolean>;
  syncServerQuota: () => Promise<void>;
  guestTokensUsed: number;
  guestDailyLimit: number;
  clearAuthError: () => void;
}

const DEFAULT_GOOGLE_DAILY_LIMIT = 50000; // 50,000 tokens per day for Google logged in users
const DEFAULT_GUEST_DAILY_LIMIT = 10000;  // 10,000 tokens per day for guests

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getTodayString = () => new Date().toISOString().split('T')[0];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserTokenProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthPending, setIsAuthPending] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [deviceId] = useState<string>(() => getDeviceFingerprint());

  // Guest Local Storage tracking
  const [guestTokensUsed, setGuestTokensUsed] = useState<number>(0);

  // Sync server quota directly
  const syncServerQuota = useCallback(async () => {
    try {
      const res = await fetch(`/api/quota`, {
        headers: {
          'x-device-id': deviceId,
        },
        method: 'GET',
      });
      if (res.ok) {
        const data = await res.json();
        if (user) {
          setProfile((prev) => prev ? {
            ...prev,
            tokensUsedToday: data.usedToday,
            dailyLimit: data.dailyLimit,
          } : null);
          // Persist to user Firestore document with client auth credentials
          try {
            const userDocRef = doc(db, 'users', user.uid);
            setDoc(userDocRef, {
              tokensUsedToday: data.usedToday,
              dailyLimit: data.dailyLimit,
              lastResetDate: getTodayString(),
              updatedAt: new Date().toISOString(),
            }, { merge: true }).catch(() => {});
          } catch (err) {
            // ignore
          }
        } else {
          setGuestTokensUsed(data.usedToday);
        }
      }
    } catch (e) {
      console.warn('Quota sync warning:', e);
    }
  }, [deviceId, user, profile]);

  // Sync profile data from Firestore
  const syncUserProfile = async (currentUser: User) => {
    const userDocRef = doc(db, 'users', currentUser.uid);
    const today = getTodayString();

    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data() as UserTokenProfile;
        // Check if date reset is needed
        if (data.lastResetDate !== today) {
          const updatedProfile: UserTokenProfile = {
            ...data,
            tokensUsedToday: 0,
            lastResetDate: today,
            updatedAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, updatedProfile, { merge: true });
          setProfile(updatedProfile);
        } else {
          setProfile(data);
        }
      } else {
        // Create new profile on first login
        const newProfile: UserTokenProfile = {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || 'Pengguna ADJDEV',
          photoURL: currentUser.photoURL || '',
          tokensUsedToday: 0,
          dailyLimit: DEFAULT_GOOGLE_DAILY_LIMIT,
          lastResetDate: today,
          totalTokensUsed: 0,
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, newProfile);
        setProfile(newProfile);
      }
      await syncServerQuota();
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncUserProfile(currentUser);
      } else {
        setProfile(null);
        await syncServerQuota();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const clearAuthError = () => setAuthError(null);

  const signInWithGoogle = async () => {
    if (isAuthPending) return;
    setIsAuthPending(true);
    setAuthError(null);

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      const errorCode = error?.code || '';
      if (
        errorCode === 'auth/cancelled-popup-request' ||
        errorCode === 'auth/popup-closed-by-user'
      ) {
        console.log('Login Google dibatalkan oleh pengguna.');
      } else if (errorCode === 'auth/popup-blocked') {
        setAuthError('Popup login diblokir oleh peramban. Harap izinkan popup.');
      } else {
        console.warn('Google Sign-In Warning:', errorCode, error?.message);
        setAuthError(error?.message || 'Gagal masuk dengan akun Google.');
      }
    } finally {
      setIsAuthPending(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setProfile(null);
      await syncServerQuota();
    } catch (error) {
      console.error('Gagal Logout:', error);
    }
  };

  // Check if user or guest has remaining quota
  const checkHasQuota = (estimatedTokens: number = 100): boolean => {
    if (user && profile) {
      return (profile.tokensUsedToday + estimatedTokens) <= profile.dailyLimit;
    }
    // Guest mode check
    return (guestTokensUsed + estimatedTokens) <= DEFAULT_GUEST_DAILY_LIMIT;
  };

  // Sync token usage with server
  const recordTokenUsage = async (amount: number): Promise<boolean> => {
    await syncServerQuota();
    return checkHasQuota(0);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAuthPending,
        authError,
        deviceId,
        signInWithGoogle,
        logout,
        checkHasQuota,
        recordTokenUsage,
        syncServerQuota,
        guestTokensUsed,
        guestDailyLimit: DEFAULT_GUEST_DAILY_LIMIT,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return context;
};
