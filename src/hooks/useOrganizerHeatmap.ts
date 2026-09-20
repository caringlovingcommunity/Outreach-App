import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
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
    let isMounted = true;

    const fetchHeatmapData = async () => {
      if (!user || user.role !== 'organizer' || !activeSemester) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // 1. Fetch all student profiles for mapping names/photos
        const usersRef = query(collection(db, 'users_public'), where('role', '==', 'student'));
        const usersSnap = await getDocs(usersRef);
        const privateUsersSnap = await getDocs(collection(db, 'users_private'));
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

        // 2. Fetch all availability submissions for the active semester
        const availRef = collection(db, 'availabilities');
        const availQuery = query(availRef, where('semesterId', '==', activeSemester.semesterId));
        const availSnap = await getDocs(availQuery);

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

        if (isMounted) {
          setAggregations(slotMap);
          setTotalStudentsSubmitted(submittingUserIds.size);
        }
      } catch (err: any) {
        console.error('Error fetching organizer heatmap data:', err);
        if (isMounted) {
          setError('Failed to load team availability. Check Firestore permissions.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchHeatmapData();

    return () => {
      isMounted = false;
    };
  }, [user, activeSemester]);

  return {
    aggregations,
    totalStudentsSubmitted,
    loading,
    error,
  };
};