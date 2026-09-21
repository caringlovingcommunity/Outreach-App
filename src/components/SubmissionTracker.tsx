import React, { useEffect, useState } from 'react';
import { useSubmissionTracker } from '../hooks/useSubmissionTracker';

interface SubmissionTrackerProps {
  activeSemesterId: string | undefined;
  activeSemesterName: string | undefined;
}

export const SubmissionTracker: React.FC<SubmissionTrackerProps> = ({ activeSemesterId, activeSemesterName }) => {
  const { submittedStudents, pendingStudents, totalStudents, submissionRate, loading, error } = useSubmissionTracker(activeSemesterId);
  const [activeTab, setActiveTab] = useState<'pending' | 'submitted'>('pending');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  if (loading) return <div className="app-loading-state text-muted">Calculating submission statistics...</div>;
  if (error) return <div className="app-alert-error">{error}</div>;

  return (
    <div className="app-panel mt-2 mb-8 p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-text">Submission Progress</h2>
          <p className="text-sm text-muted">{activeSemesterName || 'Current Semester'}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="my-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-text">
            {submittedStudents.length} of {totalStudents} Students Submitted
          </span>
          <span className="text-sm font-bold text-primary">{submissionRate}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-3 rounded-full bg-primary transition-all duration-500"
            style={{ width: `${submissionRate}%` }}
          />
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="mb-4 flex border-b border-border">
        <button
          onClick={() => setActiveTab('pending')}
          className={`border-b-2 px-4 py-2 text-sm font-semibold ${
            activeTab === 'pending'
              ? 'border-warning text-warning'
              : 'border-transparent text-muted hover:text-text'
          }`}
        >
          Pending ({pendingStudents.length})
        </button>
        <button
          onClick={() => setActiveTab('submitted')}
          className={`border-b-2 px-4 py-2 text-sm font-semibold ${
            activeTab === 'submitted'
              ? 'border-success text-success'
              : 'border-transparent text-muted hover:text-text'
          }`}
        >
          Submitted ({submittedStudents.length})
        </button>
      </div>

      {/* Student List */}
      <div className="max-h-64 divide-y divide-border overflow-y-auto">
        {(activeTab === 'pending' ? pendingStudents : submittedStudents).length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">No students in this list.</p>
        ) : (
          (activeTab === 'pending' ? pendingStudents : submittedStudents).map((student) => (
            <div key={student.uid} className="py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {student.photoURL ? (
                  <img src={student.photoURL} alt={student.displayName} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                    {student.displayName.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-text">{student.displayName}</p>
                  <p className="text-xs text-muted">{student.email}</p>
                </div>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                activeTab === 'pending' ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success'
              }`}>
                {activeTab === 'pending' ? 'Pending' : 'Submitted'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};