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

        // Fetch existing availability for this user + active semester
        const availabilityId = `${user.uid}_${semesterData.semesterId}`;
        const availabilityRef = doc(db, 'availabilities', availabilityId);
        const availabilitySnap = await getDoc(availabilityRef);

        if (availabilitySnap.exists() && isMounted) {
          const data = availabilitySnap.data() as Availability;
          setSelectedSlots(data.slots || []);
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

  // 2. Toggle a slot selection in local state
  const toggleSlot = (slotKey: string) => {
    setSaveSuccess(false); // Reset success indicator on modification
    setSelectedSlots((prev) =>
      prev.includes(slotKey)
        ? prev.filter((key) => key !== slotKey)
        : [...prev, slotKey]
    );
  };

  // 3. Persist availability slots to Firestore
  const saveAvailability = async (): Promise<boolean> => {
    if (!user || !activeSemester) {
      setError('Cannot save: User or Active Semester is missing.');
      return false;
    }

    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);

      const availabilityId = `${user.uid}_${activeSemester.semesterId}`;
      const availabilityRef = doc(db, 'availabilities', availabilityId);

      const payload = {
        userId: user.uid,
        semesterId: activeSemester.semesterId,
        slots: selectedSlots,
        updatedAt: serverTimestamp(),
      };

      await setDoc(availabilityRef, payload, { merge: true });

      setSaveSuccess(true);
      return true;
    } catch (err: any) {
      console.error('Error saving availability:', err);
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
    saveAvailability,
  };
};