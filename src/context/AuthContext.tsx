import React, { createContext, useContext, useState, useEffect } from 'react';
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
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  checkHasQuota: (estimatedTokens?: number) => boolean;
  recordTokenUsage: (amount: number) => Promise<boolean>;
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

  // Guest Local Storage tracking
  const [guestTokensUsed, setGuestTokensUsed] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('adjdev_guest_tokens');
      const savedDate = localStorage.getItem('adjdev_guest_date');
      if (savedDate === getTodayString() && saved) {
        return parseInt(saved, 10) || 0;
      }
    } catch {}
    return 0;
  });

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
        // User closed or cancelled the popup safely - do not treat as an unhandled error
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

  // Record token usage after a response is generated
  const recordTokenUsage = async (amount: number): Promise<boolean> => {
    if (amount <= 0) return true;

    if (user && profile) {
      const today = getTodayString();
      const userDocRef = doc(db, 'users', user.uid);

      let newUsedToday = profile.tokensUsedToday + amount;
      if (profile.lastResetDate !== today) {
        newUsedToday = amount;
      }

      const updatedProfile: Partial<UserTokenProfile> = {
        tokensUsedToday: newUsedToday,
        totalTokensUsed: (profile.totalTokensUsed || 0) + amount,
        lastResetDate: today,
        updatedAt: new Date().toISOString(),
      };

      try {
        await updateDoc(userDocRef, updatedProfile);
        setProfile((prev) => (prev ? { ...prev, ...updatedProfile } as UserTokenProfile : null));
        return newUsedToday <= profile.dailyLimit;
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
        return false;
      }
    } else {
      // Record guest usage in localStorage
      const newGuestUsed = guestTokensUsed + amount;
      setGuestTokensUsed(newGuestUsed);
      try {
        localStorage.setItem('adjdev_guest_tokens', newGuestUsed.toString());
        localStorage.setItem('adjdev_guest_date', getTodayString());
      } catch {}
      return newGuestUsed <= DEFAULT_GUEST_DAILY_LIMIT;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAuthPending,
        authError,
        signInWithGoogle,
        logout,
        checkHasQuota,
        recordTokenUsage,
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
