import React, { useState } from 'react';
import { useSubmissionTracker } from '../hooks/useSubmissionTracker';

interface SubmissionTrackerProps {
  activeSemesterId: string | undefined;
  activeSemesterName: string | undefined;
}

export const SubmissionTracker: React.FC<SubmissionTrackerProps> = ({ activeSemesterId, activeSemesterName }) => {
  const { submittedStudents, pendingStudents, totalStudents, submissionRate, loading, error } = useSubmissionTracker(activeSemesterId);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'submitted'>('pending');

  const handleCopyEmails = () => {
    const emails = pendingStudents.map(s => s.email).filter(Boolean).join(', ');
    if (emails) {
      navigator.clipboard.writeText(emails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Calculating submission statistics...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-700 rounded-md">{error}</div>;

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-8 mt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-200 gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Submission Progress</h2>
          <p className="text-sm text-gray-500">{activeSemesterName || 'Current Semester'}</p>
        </div>
        
        {/* {pendingStudents.length > 0 && (
          <button
            onClick={handleCopyEmails}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {copied ? '✓ Emails Copied!' : '📋 Copy Pending Emails'}
          </button>
        )} */}
      </div>

      {/* Progress Bar */}
      <div className="my-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-700">
            {submittedStudents.length} of {totalStudents} Students Submitted
          </span>
          <span className="text-sm font-bold text-indigo-600">{submissionRate}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${submissionRate}%` }}
          />
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('pending')}
          className={`py-2 px-4 border-b-2 font-medium text-sm ${
            activeTab === 'pending'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Pending ({pendingStudents.length})
        </button>
        <button
          onClick={() => setActiveTab('submitted')}
          className={`py-2 px-4 border-b-2 font-medium text-sm ${
            activeTab === 'submitted'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Submitted ({submittedStudents.length})
        </button>
      </div>

      {/* Student List */}
      <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
        {(activeTab === 'pending' ? pendingStudents : submittedStudents).length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">No students in this list.</p>
        ) : (
          (activeTab === 'pending' ? pendingStudents : submittedStudents).map((student) => (
            <div key={student.uid} className="py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {student.photoURL ? (
                  <img src={student.photoURL} alt={student.displayName} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                    {student.displayName.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{student.displayName}</p>
                  <p className="text-xs text-gray-500">{student.email}</p>
                </div>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                activeTab === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
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