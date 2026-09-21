import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import type { Semester, Availability } from '../types';

export const fetchUserAvailability = async (
  userId: string,
  semesterId: string
): Promise<string[]> => {
  try {
    const availabilityRef = doc(db, 'availabilities', `${userId}_${semesterId}`);
    const availabilitySnap = await getDoc(availabilityRef);

    if (availabilitySnap.exists()) {
      const data = availabilitySnap.data() as Availability;
      return data.slots || [];
    }

    return [];
  } catch (error) {
    console.error('Error fetching availability:', error);
    throw error;
  }
};

export const useAvailability = () => {
  const { user } = useAuth();
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // 1. Fetch active semester and student's existing availability profile
  useEffect(() => {
    let isMounted = true;

    const fetchSemesterAndAvailability = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch the currently active semester
        const semestersRef = collection(db, 'semesters');
        const activeQuery = query(semestersRef, where('isActive', '==', true));
        const semesterSnap = await getDocs(activeQuery);

        if (semesterSnap.empty) {
          if (isMounted) {
            setActiveSemester(null);
            setError('No active semester found. Please contact an organizer.');
            setLoading(false);
          }
          return;
        }

        const activeSemesterDoc = semesterSnap.docs[0];
        const semesterData = {
          semesterId: activeSemesterDoc.id,
          ...activeSemesterDoc.data(),
        } as Semester;

        if (isMounted) {
          setActiveSemester(semesterData);
        }

        // Missing availability documents are a normal empty state for students.
        const slots = await fetchUserAvailability(user.uid, semesterData.semesterId);
        if (isMounted) {
          setSelectedSlots(slots);
        }
      } catch (err: any) {
        console.error('Error fetching availability data:', err);
        if (isMounted) {
          setError('Failed to load availability data. Please refresh.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSemesterAndAvailability();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Toggle locally first, then persist the resulting selection.
  const toggleSlot = async (slotKey: string) => {
    if (!user || !activeSemester) {
      setError('Cannot update availability: User or Active Semester is missing.');
      return;
    }

    const nextSlots = selectedSlots.includes(slotKey)
      ? selectedSlots.filter((key) => key !== slotKey)
      : [...selectedSlots, slotKey];

    setSelectedSlots(nextSlots);
    setSaveSuccess(false);

    try {
      setSaving(true);
      setError(null);

      const availabilityId = `${user.uid}_${activeSemester.semesterId}`;
      const availabilityRef = doc(db, 'availabilities', availabilityId);

      const payload = {
        userId: user.uid,
        semesterId: activeSemester.semesterId,
        slots: nextSlots,
        updatedAt: serverTimestamp(),
      };

      await setDoc(availabilityRef, payload, { merge: true });

      setSaveSuccess(true);
    } catch (err: any) {
      console.error('Error updating availability:', err);
      setError('Failed to save availability. Please try again.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    activeSemester,
    selectedSlots,
    loading,
    saving,
    error,
    saveSuccess,
    toggleSlot,
  };
};