import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllStudents, getStudentFullDetail, type StudentListItem } from '../services/organizerService';
import type { PublicUserProfile } from '../types/user';
import { FACULTIES } from '../constants/unimasData';

export const OrganizerStudentList: React.FC = () => {
  const { user } = useAuth();

  // List State
  const [students, setStudents] = useState<PublicUserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');

  // Selected Student Modal State
  const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(null);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // 1. Check authorization & fetch public student directory
  useEffect(() => {
    const fetchDirectory = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAllStudents();
        setStudents(data);
      } catch (err: any) {
        console.error('Error fetching student list:', err);
        setError(err.message || 'Failed to load student directory.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'organizer') {
      fetchDirectory();
    }
  }, [user]);

  // 2. Client-side filtering logic
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        student.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.course?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFaculty = selectedFaculty ? student.faculty === selectedFaculty : true;

      return matchesSearch && matchesFaculty;
    });
  }, [students, searchQuery, selectedFaculty]);

  // 3. Open modal & fetch private details on demand
  const handleOpenDetail = async (studentId: string) => {
    setModalLoading(true);
    setModalError(null);
    setSelectedStudent(null);

    try {
      const fullDetail = await getStudentFullDetail(studentId);
      if (fullDetail) {
        setSelectedStudent(fullDetail);
      } else {
        setModalError('Student profile details not found.');
      }
    } catch (err: any) {
      console.error('Error opening student modal:', err);
      setModalError(err.message || 'Failed to fetch student contact details.');
    } finally {
      setModalLoading(false);
    }
  };

  // Access Control Guard
  if (user?.role !== 'organizer') {
    return (
      <div className="max-w-xl mx-auto mt-12 p-6 bg-red-50 border border-red-200 rounded-xl text-center">
        <h2 className="text-lg font-bold text-red-800">Access Restricted</h2>
        <p className="text-sm text-red-600 mt-2">
          You must have an <strong>Organizer</strong> account to view the student directory.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Directory</h1>
          <p className="text-sm text-gray-500 mt-1">
            View registered outreach students, academic details, and contact numbers.
          </p>
        </div>
        <div className="text-sm font-medium bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200 self-start md:self-auto">
          Total Registered: {students.length}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Search Student
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or course..."
            className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Filter by Faculty
          </label>
          <select
            value={selectedFaculty}
            onChange={(e) => setSelectedFaculty(e.target.value)}
            className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Faculties</option>
            {FACULTIES.map((f) => (
              <option key={f.code} value={f.code}>
                {f.code} - {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex justify-center items-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-lg text-sm">
          {error}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <p className="text-gray-500 text-sm">No students found matching your criteria.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {filteredStudents.map((student) => (
              <article key={student.uid} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  {student.photoURL ? (
                    <img
                      src={student.photoURL}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                      {student.displayName.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold text-gray-900">{student.displayName}</h2>
                    <p className="mt-0.5 truncate text-xs text-gray-500">{student.course || 'Course not provided'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenDetail(student.uid)}
                    className="shrink-0 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 active:bg-blue-100"
                  >
                    Details
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">Faculty</span>
                    <span className="mt-0.5 block truncate font-medium text-gray-700">{student.faculty || 'Not provided'}</span>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">Year</span>
                    <span className="mt-0.5 block font-medium text-gray-700">{student.yearOfStudy ? `Year ${student.yearOfStudy}` : 'Not provided'}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Faculty</th>
                  <th className="px-6 py-3">Course</th>
                  <th className="px-6 py-3">Year</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.uid} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      {student.photoURL ? (
                        <img
                          src={student.photoURL}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                          {student.displayName.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium text-gray-900">{student.displayName}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{student.faculty || '—'}</td>
                    <td className="px-6 py-4">{student.course || '—'}</td>
                    <td className="px-6 py-4">{student.yearOfStudy ? `Year ${student.yearOfStudy}` : '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(student.uid)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium rounded-md text-xs transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}

      {/* STUDENT DETAIL MODAL */}
      {(modalLoading || selectedStudent || modalError) && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-xl">
            
            {/* Modal Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Student Contact Details</h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedStudent(null);
                  setModalError(null);
                }}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6">
              {modalLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : modalError ? (
                <div className="p-4 bg-red-50 text-red-800 rounded-lg text-sm">{modalError}</div>
              ) : selectedStudent ? (
                <div className="space-y-4 text-sm">
                  
                  {/* Public Identity Summary */}
                  <div className="flex items-center gap-3 pb-4 border-b">
                    {selectedStudent.photoURL ? (
                      <img
                        src={selectedStudent.photoURL}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                        {selectedStudent.displayName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-gray-900 text-base">
                        {selectedStudent.displayName}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {selectedStudent.faculty || 'No Faculty'} • {selectedStudent.course || 'No Course'}
                      </p>
                    </div>
                  </div>

                  {/* Private Details Grid */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <span className="block text-xs font-semibold text-gray-400 uppercase">
                        Email Address
                      </span>
                      <span className="text-gray-800 font-medium break-all">
                        {selectedStudent.privateDetails?.email || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-gray-400 uppercase">
                        Phone / WhatsApp
                      </span>
                      {selectedStudent.privateDetails?.phone ? (
                        <a
                          href={`https://wa.me/${selectedStudent.privateDetails.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {selectedStudent.privateDetails.phone} ↗
                        </a>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-gray-400 uppercase">
                        Residential College
                      </span>
                      <span className="text-gray-800 font-medium">
                        {selectedStudent.privateDetails?.college || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-gray-400 uppercase">
                        Gender
                      </span>
                      <span className="text-gray-800 font-medium">
                        {selectedStudent.privateDetails?.gender || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-gray-400 uppercase">
                        Hometown / Race
                      </span>
                      <span className="text-gray-800 font-medium">
                        {[selectedStudent.privateDetails?.hometown, selectedStudent.privateDetails?.race]
                          .filter(Boolean)
                          .join(' / ') || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-gray-400 uppercase">
                        Invited By
                      </span>
                      <span className="text-gray-800 font-medium">
                        {selectedStudent.privateDetails?.invitedByName || '—'}
                      </span>
                    </div>
                  </div>

                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedStudent(null);
                  setModalError(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};