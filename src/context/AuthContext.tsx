import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured } from '../services/firebase';
import type { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const publicProfileRef = doc(db, 'users_public', firebaseUser.uid);
          const privateProfileRef = doc(db, 'users_private', firebaseUser.uid);
          const publicProfileSnap = await getDoc(publicProfileRef);
          const privateProfileSnap = await getDoc(privateProfileRef);

          if (!publicProfileSnap.exists()) {
            const legacyProfileSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
            const legacyData = legacyProfileSnap.exists() ? legacyProfileSnap.data() : {};
            const role = legacyData.role === 'organizer' ? 'organizer' : 'student';
            const newPublicProfile = {
              uid: firebaseUser.uid,
              displayName: legacyData.displayName || firebaseUser.displayName || 'User',
              photoURL: legacyData.photoURL || firebaseUser.photoURL || '',
              role: role as UserRole,
              createdAt: serverTimestamp(),
            };
            const newPrivateProfile = {
              uid: firebaseUser.uid,
              email: legacyData.email || firebaseUser.email || '',
              createdAt: serverTimestamp(),
            };

            await Promise.all([
              setDoc(publicProfileRef, newPublicProfile),
              setDoc(privateProfileRef, newPrivateProfile),
            ]);
            setUser({ ...newPublicProfile, email: newPrivateProfile.email });
          } else {
            const publicData = publicProfileSnap.data();
            const privateData = privateProfileSnap.exists() ? privateProfileSnap.data() : {};
            const existingProfile: UserProfile = {
              uid: publicData.uid || firebaseUser.uid,
              email: privateData.email ?? (firebaseUser.email || ''),
              displayName: publicData.displayName ?? (firebaseUser.displayName || ''),
              photoURL: publicData.photoURL ?? (firebaseUser.photoURL || ''),
              role: (publicData.role as UserRole) || 'student',
              createdAt: publicData.createdAt,
            };
            if (!privateProfileSnap.exists()) {
              await setDoc(privateProfileRef, {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                createdAt: serverTimestamp(),
              });
            }
            setUser(existingProfile);
          }
        } catch (error) {
          console.error('Error fetching or creating user profile in Firestore:', error);
          // Fallback gracefully so the session is preserved even if Firestore rules or offline restricts access
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'User',
            photoURL: firebaseUser.photoURL || '',
            role: 'student',
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<void> => {
    if (!isFirebaseConfigured) {
      throw new Error(
        'Firebase configuration is missing or incomplete. Please ensure your VITE_FIREBASE_* environment variables are set.'
      );
    }
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      // Handle OAuth popup cancellations cleanly without breaking state
      if (
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/cancelled-popup-request' ||
        error?.code === 'auth/popup-blocked'
      ) {
        console.info('Google sign-in popup was closed or cancelled by user.');
      } else {
        console.error('Error during Google sign-in:', error);
        throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
