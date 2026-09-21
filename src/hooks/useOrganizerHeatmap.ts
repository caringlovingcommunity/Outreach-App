import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, type QuerySnapshot, type DocumentData } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import type { Semester, UserProfile, Availability } from '../types';

export interface SlotAggregation {
  slotKey: string;
  count: number;
  availableUsers: HeatmapStudent[];
}

export interface HeatmapStudent extends UserProfile {
  phoneNumber?: string;
  gender?: 'male' | 'female';
}

export const useOrganizerHeatmap = (activeSemester: Semester | null) => {
  const { user } = useAuth();
  const [aggregations, setAggregations] = useState<Record<string, SlotAggregation>>({});
  const [totalStudentsSubmitted, setTotalStudentsSubmitted] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !['organizer', 'admin'].includes(user.role) || !activeSemester) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);
    let usersSnap: QuerySnapshot<DocumentData> | null = null;
    let privateUsersSnap: QuerySnapshot<DocumentData> | null = null;
    let availSnap: QuerySnapshot<DocumentData> | null = null;

    const processSnapshots = () => {
      if (!usersSnap || !privateUsersSnap || !availSnap) return;
      try {
        const privateUserMap = new Map<string, { email?: string; phone?: string; gender?: 'Male' | 'Female' }>();
        privateUsersSnap.docs.forEach((doc) => {
          privateUserMap.set(doc.id, doc.data() as { email?: string });
        });
        const userMap = new Map<string, HeatmapStudent>();
        usersSnap.docs.forEach((doc) => {
          const publicData = doc.data();
          userMap.set(doc.id, {
            uid: doc.id,
            displayName: publicData.displayName || privateUserMap.get(doc.id)?.email?.split('@')[0] || 'Anonymous Student',
            email: privateUserMap.get(doc.id)?.email || '',
            photoURL: publicData.photoURL || '',
            role: 'student',
            createdAt: publicData.createdAt,
            phoneNumber: privateUserMap.get(doc.id)?.phone,
            gender: privateUserMap.get(doc.id)?.gender?.toLowerCase() as 'male' | 'female' | undefined,
          });
        });

        const slotMap: Record<string, SlotAggregation> = {};
        const submittingUserIds = new Set<string>();

        availSnap.docs.forEach((docSnap) => {
          const availData = docSnap.data() as Availability;
          submittingUserIds.add(availData.userId);

          const studentProfile = userMap.get(availData.userId) || {
            uid: availData.userId,
            displayName: 'Anonymous Student',
            email: '',
            photoURL: '',
            role: 'student',
            createdAt: '',
          };

          (availData.slots || []).forEach((slotKey) => {
            if (!slotMap[slotKey]) {
              slotMap[slotKey] = {
                slotKey,
                count: 0,
                availableUsers: [],
              };
            }
            slotMap[slotKey].count += 1;
            slotMap[slotKey].availableUsers.push(studentProfile);
          });
        });

        setAggregations(slotMap);
        setTotalStudentsSubmitted(submittingUserIds.size);
        setLoading(false);
      } catch (err) {
        console.error('Error processing organizer heatmap data:', err);
        setError('Failed to load team availability. Check Firestore permissions.');
        setLoading(false);
      }
    };

    const handleError = () => {
      setError('Failed to load team availability. Check Firestore permissions.');
      setLoading(false);
    };
    const unsubscribeUsers = onSnapshot(query(collection(db, 'users_public'), where('role', '==', 'student')), (snapshot) => { usersSnap = snapshot; processSnapshots(); }, handleError);
    const unsubscribePrivateUsers = onSnapshot(collection(db, 'users_private'), (snapshot) => { privateUsersSnap = snapshot; processSnapshots(); }, handleError);
    const unsubscribeAvailability = onSnapshot(query(collection(db, 'availabilities'), where('semesterId', '==', activeSemester.semesterId)), (snapshot) => { availSnap = snapshot; processSnapshots(); }, handleError);

    return () => {
      unsubscribeUsers();
      unsubscribePrivateUsers();
      unsubscribeAvailability();
    };
  }, [user, activeSemester]);

  return {
    aggregations,
    totalStudentsSubmitted,
    loading,
    error,
  };
};