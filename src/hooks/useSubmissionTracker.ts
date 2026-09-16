import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

export interface StudentProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

export interface SubmissionStats {
  submittedStudents: StudentProfile[];
  pendingStudents: StudentProfile[];
  totalStudents: number;
  submissionRate: number;
  loading: boolean;
  error: string | null;
}

export function useSubmissionTracker(activeSemesterId: string | undefined): SubmissionStats {
  const [submittedStudents, setSubmittedStudents] = useState<StudentProfile[]>([]);
  const [pendingStudents, setPendingStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeSemesterId) {
      setLoading(false);
      return;
    }

    const fetchTrackerData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch all students
        const usersQuery = query(collection(db, 'users_public'), where('role', '==', 'student'));
        const usersSnap = await getDocs(usersQuery);
        const privateUsersSnap = await getDocs(collection(db, 'users_private'));
        const privateUsers = new Map(
          privateUsersSnap.docs.map((studentDoc) => [studentDoc.id, studentDoc.data().email || ''])
        );
        const allStudents: StudentProfile[] = usersSnap.docs.map(doc => ({
          uid: doc.id,
          displayName: doc.data().displayName || 'Unknown Student',
          email: privateUsers.get(doc.id) || '',
          photoURL: doc.data().photoURL,
        }));

        // 2. Fetch all availabilities for active semester
        const availQuery = query(collection(db, 'availabilities'), where('semesterId', '==', activeSemesterId));
        const availSnap = await getDocs(availQuery);
        
        // Collect UIDs of students who have submitted and selected at least 1 slot
        const submittedUserIds = new Set<string>();
        availSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.userId && Array.isArray(data.slots) && data.slots.length > 0) {
            submittedUserIds.add(data.userId);
          }
        });

        // 3. Partition students
        const submitted = allStudents.filter(s => submittedUserIds.has(s.uid));
        const pending = allStudents.filter(s => !submittedUserIds.has(s.uid));

        setSubmittedStudents(submitted);
        setPendingStudents(pending);
      } catch (err) {
        console.error('Error fetching submission tracker data:', err);
        setError('Failed to compute submission statistics.');
      } finally {
        setLoading(false);
      }
    };

    fetchTrackerData();
  }, [activeSemesterId]);

  const totalStudents = submittedStudents.length + pendingStudents.length;
  const submissionRate = totalStudents > 0 ? Math.round((submittedStudents.length / totalStudents) * 100) : 0;

  return {
    submittedStudents,
    pendingStudents,
    totalStudents,
    submissionRate,
    loading,
    error,
  };
}