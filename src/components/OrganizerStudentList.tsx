import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDisciplerForStudent } from '../services/contactsService';
import { getAllApprovedUsers, getUserFullDetail, type DirectoryUser } from '../services/organizerService';
import type { PublicUserProfile } from '../types/user';
import { FACULTIES } from '../constants/unimasData';

export const OrganizerStudentList: React.FC = () => {
  const { user } = useAuth();

  // List State
  const [students, setStudents] = useState<PublicUserProfile[]>([]);
  const [disciplerNames, setDisciplerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [profileFilter, setProfileFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'faculty' | 'course' | 'year' | 'role'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Selected Student Modal State
  const [selectedStudent, setSelectedStudent] = useState<DirectoryUser | null>(null);
  const [disciplerName, setDisciplerName] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // 1. Check authorization & fetch public student directory
  useEffect(() => {
    const fetchDirectory = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAllApprovedUsers();
        setStudents(data);
        const disciplerEntries = await Promise.all(data.map(async (student) => {
          const discipler = await getDisciplerForStudent(student.uid);
          return discipler ? [student.uid, discipler.displayName] as const : null;
        }));
        setDisciplerNames(Object.fromEntries(disciplerEntries.filter(Boolean) as [string, string][]));
      } catch (err: any) {
        console.error('Error fetching student list:', err);
        setError(err.message || 'Failed to load student directory.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'organizer' || user?.role === 'admin') {
      fetchDirectory();
    }
  }, [user]);

  // 2. Client-side filtering logic
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        student.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.course?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.role.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFaculty = selectedFaculty ? student.faculty === selectedFaculty : true;
      const matchesRole = selectedRole ? student.role === selectedRole : true;
      const matchesYear = selectedYear ? String(student.yearOfStudy || '') === selectedYear : true;
      const matchesProfile = profileFilter
        ? profileFilter === 'complete'
          ? student.membershipStatus === 'APPROVED'
          : student.membershipStatus !== 'APPROVED'
        : true;

      return matchesSearch && matchesFaculty && matchesRole && matchesYear && matchesProfile;
    }).sort((left, right) => {
      const values = {
        name: [left.displayName, right.displayName],
        faculty: [left.faculty || '', right.faculty || ''],
        course: [left.course || '', right.course || ''],
        year: [String(left.yearOfStudy || 0), String(right.yearOfStudy || 0)],
        role: [left.role, right.role],
      }[sortBy];
      const comparison = values[0].localeCompare(values[1], undefined, { numeric: true });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [students, searchQuery, selectedFaculty, selectedRole, selectedYear, profileFilter, sortBy, sortDirection]);

  // 3. Open modal & fetch private details on demand
  const handleOpenDetail = async (studentId: string) => {
    setModalLoading(true);
    setModalError(null);
    setSelectedStudent(null);
    setDisciplerName(null);

    try {
      const [fullDetail, discipler] = await Promise.all([
        getUserFullDetail(studentId),
        getDisciplerForStudent(studentId),
      ]);
      if (fullDetail) {
        setSelectedStudent(fullDetail);
        setDisciplerName(discipler?.displayName || null);
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
  if (user?.role !== 'organizer' && user?.role !== 'admin') {
    return (
      <div className="app-alert-error mx-auto mt-12 max-w-xl flex-col p-6 text-center">
        <h2 className="text-lg font-bold">Access Restricted</h2>
        <p className="mt-2 text-sm">
          You must have an <strong>Organizer</strong> account to view the student directory.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl py-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">User Directory</h1>
          <p className="mt-1 text-sm text-muted">
            View approved students and organizers, academic details, and contact information.
          </p>
        </div>
        <div className="self-start rounded-app-md border border-primary-muted bg-primary-soft px-3 py-1.5 text-sm font-semibold text-primary md:self-auto">
          Showing {filteredStudents.length} of {students.length} users
        </div>
      </div>

      {/* Filters Bar */}
      <div className="app-panel mb-6 grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="app-label uppercase tracking-wider">
            Search User
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, course, or role..."
            className="app-input"
          />
        </div>

        <div>
          <label className="app-label uppercase tracking-wider">
            Filter by Faculty
          </label>
          <select
            value={selectedFaculty}
            onChange={(e) => setSelectedFaculty(e.target.value)}
            className="app-input"
          >
            <option value="">All Faculties</option>
            {FACULTIES.map((f) => (
              <option key={f.code} value={f.code}>
                {f.code} - {f.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="app-label uppercase tracking-wider">Filter by Role</label>
          <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="app-input">
            <option value="">All Roles</option>
            <option value="student">Student</option>
            <option value="organizer">Organizer</option>
          </select>
        </div>
        <div>
          <label className="app-label uppercase tracking-wider">Filter by Year</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="app-input">
            <option value="">All Years</option>
            {[1, 2, 3, 4, 5].map((year) => <option key={year} value={year}>Year {year}</option>)}
          </select>
        </div>
        <div>
          <label className="app-label uppercase tracking-wider">Profile Status</label>
          <select value={profileFilter} onChange={(e) => setProfileFilter(e.target.value)} className="app-input">
            <option value="">All Profiles</option>
            <option value="complete">Approved</option>
          </select>
        </div>
        <div>
          <label className="app-label uppercase tracking-wider">Sort By</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="app-input">
            <option value="name">Name</option>
            <option value="faculty">Faculty</option>
            <option value="course">Course</option>
            <option value="year">Year</option>
            <option value="role">Role</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button type="button" onClick={() => setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc')} className="app-button-secondary flex-1">
            {sortDirection === 'asc' ? 'A-Z / Low-High' : 'Z-A / High-Low'}
          </button>
          <button type="button" onClick={() => { setSearchQuery(''); setSelectedFaculty(''); setSelectedRole(''); setSelectedYear(''); setProfileFilter(''); setSortBy('name'); setSortDirection('asc'); }} className="app-button-text min-h-11 px-2 text-xs">
            Reset
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex justify-center items-center min-h-[40vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="app-alert-error">
          {error}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="app-empty-state p-12">
          <p className="text-sm text-muted">No students found matching your criteria.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {filteredStudents.map((student) => (
              <article key={student.uid} className="app-panel p-4">
                <div className="flex items-start gap-3">
                  {student.photoURL ? (
                    <img
                      src={student.photoURL}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                      {student.displayName.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold text-text">{student.displayName}</h2>
                    <p className="mt-0.5 truncate text-xs text-muted">{student.role} · {student.course || 'Course not provided'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenDetail(student.uid)}
                    className="app-button-text min-h-10 shrink-0 px-3 text-xs"
                  >
                    Details
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-app-sm bg-surface-muted px-3 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-subtle">Faculty</span>
                    <span className="mt-0.5 block truncate font-medium text-text">{student.faculty || 'Not provided'}</span>
                  </div>
                  <div className="rounded-app-sm bg-surface-muted px-3 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-subtle">Status</span>
                    <span className="mt-0.5 block font-medium capitalize text-text">{student.membershipStatus?.toLowerCase() || 'Unknown'}</span>
                  </div>
                  <div className="rounded-app-sm bg-surface-muted px-3 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-subtle">Year</span>
                    <span className="mt-0.5 block font-medium text-text">{student.yearOfStudy ? `Year ${student.yearOfStudy}` : 'Not provided'}</span>
                  </div>
                  <div className="rounded-app-sm bg-surface-muted px-3 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-subtle">Discipler</span>
                    <span className="mt-0.5 block truncate font-medium text-text">{disciplerNames[student.uid] || 'Not assigned'}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="app-panel hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-muted">
              <thead className="border-b border-border bg-surface-muted text-xs uppercase text-muted">
                <tr>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Faculty</th>
                  <th className="px-6 py-3">Course</th>
                  <th className="px-6 py-3">Year</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.map((student) => (
                  <tr key={student.uid} className="transition-colors hover:bg-primary-soft">
                    <td className="px-6 py-4 flex items-center gap-3">
                      {student.photoURL ? (
                        <img
                          src={student.photoURL}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                          {student.displayName.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium text-text">{student.displayName}</span>
                    </td>
                    <td className="px-6 py-4 capitalize">{student.role}</td>
                    <td className="px-6 py-4 font-mono text-xs">{student.faculty || '—'}</td>
                    <td className="px-6 py-4">{student.course || '—'}</td>
                    <td className="px-6 py-4">{student.yearOfStudy ? `Year ${student.yearOfStudy}` : '—'}</td>
                    <td className="px-6 py-4 capitalize">{student.membershipStatus?.toLowerCase() || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(student.uid)}
                        className="app-button-text min-h-9 px-3 py-1.5 text-xs"
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
        <div className="app-modal-backdrop items-end justify-center">
          <div className="app-modal max-h-[90vh] max-w-2xl overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border bg-surface-muted px-6 py-4">
              <h3 className="font-bold text-text">User Details</h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedStudent(null);
                  setDisciplerName(null);
                  setModalError(null);
                }}
                className="app-icon-button size-9 text-lg"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6">
              {modalLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                </div>
              ) : modalError ? (
                <div className="app-alert-error">{modalError}</div>
              ) : selectedStudent ? (
                <div className="space-y-4 text-sm">
                  
                  {/* Public Identity Summary */}
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                    {selectedStudent.photoURL ? (
                      <img
                        src={selectedStudent.photoURL}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-lg font-bold text-primary">
                        {selectedStudent.displayName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4 className="text-base font-bold text-text">
                        {selectedStudent.displayName}
                      </h4>
                      <p className="text-xs text-muted">
                        {selectedStudent.role} • {selectedStudent.faculty || 'No Faculty'} • {selectedStudent.course || 'No Course'}
                      </p>
                    </div>
                  </div>

                  {/* Private Details Grid */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <span className="block text-xs font-semibold uppercase text-subtle">
                        Discipler
                      </span>
                      <span className="font-medium text-text">
                        {disciplerName || 'Not assigned'}
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold uppercase text-subtle">
                        Email Address
                      </span>
                      <span className="break-all font-medium text-text">
                        {selectedStudent.privateDetails?.email || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold uppercase text-subtle">
                        Phone / WhatsApp
                      </span>
                      {selectedStudent.privateDetails?.phone ? (
                        <a
                          href={`https://wa.me/${selectedStudent.privateDetails.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline"
                        >
                          {selectedStudent.privateDetails.phone} ↗
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </div>

                    <div>
                      <span className="block text-xs font-semibold uppercase text-subtle">
                        Residential College
                      </span>
                      <span className="font-medium text-text">
                        {selectedStudent.privateDetails?.college || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold uppercase text-subtle">
                        Gender
                      </span>
                      <span className="font-medium text-text">
                        {selectedStudent.privateDetails?.gender || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold uppercase text-subtle">
                        Hometown / Race
                      </span>
                      <span className="font-medium text-text">
                        {[selectedStudent.privateDetails?.hometown, selectedStudent.privateDetails?.race]
                          .filter(Boolean)
                          .join(' / ') || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold uppercase text-subtle">
                        Invited By
                      </span>
                      <span className="font-medium text-text">
                        {selectedStudent.privateDetails?.invitedByName || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold uppercase text-subtle">Role</span>
                      <span className="font-medium capitalize text-text">{selectedStudent.role}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold uppercase text-subtle">Membership Status</span>
                      <span className="font-medium text-text">{selectedStudent.membershipStatus || '—'}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold uppercase text-subtle">Profile Status</span>
                      <span className="font-medium text-text">{selectedStudent.privateDetails?.isProfileComplete ? 'Complete' : 'Incomplete'}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold uppercase text-subtle">Year of Study</span>
                      <span className="font-medium text-text">{selectedStudent.yearOfStudy ? `Year ${selectedStudent.yearOfStudy}` : '—'}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold uppercase text-subtle">College</span>
                      <span className="font-medium text-text">{selectedStudent.privateDetails?.college || '—'}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold uppercase text-subtle">Approved By</span>
                      <span className="break-all font-medium text-text">{selectedStudent.approvedByEmail || selectedStudent.approvedByUid || '—'}</span>
                    </div>
                  </div>

                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-border bg-surface-muted px-6 py-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedStudent(null);
                  setModalError(null);
                }}
                className="app-button-secondary min-h-9 px-4 py-2 text-xs"
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