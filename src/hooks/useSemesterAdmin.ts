import { useState, useEffect } from 'react';
import { collection, getDocs, writeBatch, doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Semester } from '../types';
import { useAuth } from '../context/AuthContext';

export const useSemesterAdmin = () => {
  const { user } = useAuth();
  const canManageSemesters = user?.role === 'organizer' || user?.role === 'admin';
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSemesters = async () => {
    if (!user || !canManageSemesters) return;
    try {
      setLoading(true);
      const semRef = collection(db, 'semesters');
      const snap = await getDocs(semRef);
      const list: Semester[] = [];
      snap.docs.forEach((d) => {
        list.push(d.data() as Semester);
      });
      setSemesters(list);
    } catch (err: any) {
      console.error('Error fetching semesters:', err);
      setError('Failed to load semesters.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSemesters();
  }, [user, canManageSemesters]);

  // Atomically activate target semester and deactivate all others
  const setActiveSemester = async (targetSemesterId: string) => {
    if (!user || !canManageSemesters) return;
    try {
      setSubmitting(true);
      setError(null);

      const batch = writeBatch(db);

      semesters.forEach((sem) => {
        const ref = doc(db, 'semesters', sem.semesterId);
        if (sem.semesterId === targetSemesterId) {
          batch.update(ref, { isActive: true });
        } else if (sem.isActive) {
          batch.update(ref, { isActive: false });
        }
      });

      await batch.commit();
      await fetchSemesters(); // Refresh list
    } catch (err: any) {
      console.error('Error activating semester:', err);
      setError('Failed to update active semester.');
    } finally {
      setSubmitting(false);
    }
  };

  // Create a new semester
  const createSemester = async (semesterId: string, name: string, setAsActive: boolean) => {
    if (!user || !canManageSemesters) return;
    try {
      setSubmitting(true);
      setError(null);

      const newSemRef = doc(db, 'semesters', semesterId);

      if (setAsActive) {
        const batch = writeBatch(db);
        // Deactivate all current semesters
        semesters.forEach((sem) => {
          if (sem.isActive) {
            batch.update(doc(db, 'semesters', sem.semesterId), { isActive: false });
          }
        });
        // Create new active semester
        batch.set(newSemRef, {
          semesterId,
          name,
          isActive: true,
        });
        await batch.commit();
      } else {
        await setDoc(newSemRef, {
          semesterId,
          name,
          isActive: false,
        });
      }

      await fetchSemesters();
    } catch (err: any) {
      console.error('Error creating semester:', err);
      setError('Failed to create semester. Check if ID already exists.');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    semesters,
    loading,
    submitting,
    error,
    setActiveSemester,
    createSemester,
    refreshSemesters: fetchSemesters,
  };
};