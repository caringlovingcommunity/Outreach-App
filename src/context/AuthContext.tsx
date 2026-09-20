import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured } from '../services/firebase';
import type { UserProfile, UserRole } from '../types';
import type { PublicUserProfile } from '../types/user';

interface AuthContextType {
  user: UserProfile | null;
  userProfile: PublicUserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userProfile, setUserProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUserProfile = async (uid: string): Promise<PublicUserProfile | null> => {
    try {
      const profileSnap = await getDoc(doc(db, 'users_public', uid));
      if (!profileSnap.exists()) {
        setUserProfile(null);
        return null;
      }

      const profile = profileSnap.data() as PublicUserProfile;
      setUserProfile(profile);
      return profile;
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUserProfile(null);
      return null;
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (!user) return;

    const profile = await fetchUserProfile(user.uid);
    if (profile) {
      setUser((previous) => previous ? {
        ...previous,
        displayName: profile.displayName,
        photoURL: profile.photoURL || '',
        role: profile.role,
        createdAt: profile.createdAt,
      } : previous);
    }
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      unsubscribeProfile?.();
      unsubscribeProfile = null;

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
              visionCastingAccepted: role === 'organizer',
              membershipStatus: role === 'organizer' ? 'APPROVED' : 'PENDING',
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
            const publicProfile = newPublicProfile as PublicUserProfile;
            setUserProfile(publicProfile);
            setUser({
              uid: publicProfile.uid,
              email: newPrivateProfile.email,
              displayName: publicProfile.displayName,
              photoURL: publicProfile.photoURL || '',
              role: publicProfile.role,
              createdAt: publicProfile.createdAt,
            });
          } else {
            const publicData = publicProfileSnap.data();
            const publicProfile = publicData as PublicUserProfile;
            const privateData = privateProfileSnap.exists() ? privateProfileSnap.data() : {};
            const existingProfile: UserProfile = {
              uid: publicProfile.uid || firebaseUser.uid,
              email: privateData.email ?? (firebaseUser.email || ''),
              displayName: publicProfile.displayName ?? (firebaseUser.displayName || ''),
              photoURL: publicProfile.photoURL ?? (firebaseUser.photoURL || ''),
              role: (publicProfile.role as UserRole) || 'student',
              visionCastingAccepted: publicProfile.visionCastingAccepted === true,
              membershipStatus: publicProfile.membershipStatus === 'APPROVED' ? 'APPROVED' : 'PENDING',
              createdAt: publicProfile.createdAt,
            };
            if (!privateProfileSnap.exists()) {
              await setDoc(privateProfileRef, {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                createdAt: serverTimestamp(),
              });
            }
            setUserProfile(publicProfile);
            setUser(existingProfile);
          }

          unsubscribeProfile = onSnapshot(
            publicProfileRef,
            (profileSnap) => {
              if (!profileSnap.exists()) return;

              const profile = profileSnap.data() as PublicUserProfile;
              setUserProfile(profile);
              setUser((previous) => previous ? {
                ...previous,
                displayName: profile.displayName || previous.displayName,
                photoURL: profile.photoURL || '',
                role: profile.role || 'student',
                visionCastingAccepted: profile.visionCastingAccepted === true,
                membershipStatus: profile.membershipStatus,
                approvedByUid: profile.approvedByUid,
                approvedByEmail: profile.approvedByEmail,
                approvedAt: profile.approvedAt,
                createdAt: profile.createdAt,
              } : previous);
            },
            (error) => console.error('Error listening to user profile:', error),
          );
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
          setUserProfile(null);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeProfile?.();
      unsubscribe();
    };
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
      setUserProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signInWithGoogle, logout, refreshProfile }}>
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
