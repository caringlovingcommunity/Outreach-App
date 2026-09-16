import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import type { Semester, UserProfile, Availability } from '../types';

export interface SlotAggregation {
  slotKey: string;
  count: number;
  availableUsers: UserProfile[];
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
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);
        const userMap = new Map<string, UserProfile>();
        usersSnap.docs.forEach((doc) => {
          userMap.set(doc.id, doc.data() as UserProfile);
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
            displayName: 'Unknown Student',
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