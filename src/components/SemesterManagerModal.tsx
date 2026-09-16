import React, { useState } from 'react';
import { useSemesterAdmin } from '../hooks/useSemesterAdmin';
import { X, Plus, CheckCircle2, Calendar, Loader2, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSemesterChanged: () => void;
}

export const SemesterManagerModal: React.FC<Props> = ({ isOpen, onClose, onSemesterChanged }) => {
  const { semesters, loading, submitting, error, setActiveSemester, createSemester } = useSemesterAdmin();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSemId, setNewSemId] = useState('');
  const [newSemName, setNewSemName] = useState('');
  const [makeActive, setMakeActive] = useState(true);

  if (!isOpen) return null;

  const handleActivate = async (semId: string) => {
    await setActiveSemester(semId);
    onSemesterChanged();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSemId.trim() || !newSemName.trim()) return;

    await createSemester(newSemId.trim(), newSemName.trim(), makeActive);
    setNewSemId('');
    setNewSemName('');
    setShowAddForm(false);
    onSemesterChanged();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-5 space-y-4 max-h-[85vh] flex flex-col shadow-xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-gray-900 text-base">Semester Management</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Semester List */}
        <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          ) : (
            semesters.map((sem) => (
              <div
                key={sem.semesterId}
                className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                  sem.isActive
                    ? 'bg-indigo-50/60 border-indigo-300'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div>
                  <div className="font-bold text-sm text-gray-900">{sem.name}</div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5">{sem.semesterId}</div>
                </div>

                {sem.isActive ? (
                  <span className="px-2.5 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleActivate(sem.semesterId)}
                    className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl shadow-2xs transition-all active:scale-[0.98]"
                  >
                    Set Active
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add New Semester Section */}
        {showAddForm ? (
          <form onSubmit={handleCreate} className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
            <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider">Create New Semester</h4>
            
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Semester ID (Unique Key)</label>
              <input
                type="text"
                placeholder="e.g. 2026-2027-SEM2"
                value={newSemId}
                onChange={(e) => setNewSemId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Display Name</label>
              <input
                type="text"
                placeholder="e.g. 2026/2027 Semester 2"
                value={newSemName}
                onChange={(e) => setNewSemName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="makeActive"
                checked={makeActive}
                onChange={(e) => setMakeActive(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="makeActive" className="text-xs text-gray-700 font-medium">
                Set as active semester immediately
              </label>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-2 bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 shadow-xs"
              >
                {submitting ? 'Creating...' : 'Save Semester'}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="w-full py-2.5 bg-gray-900 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Create New Semester
          </button>
        )}

      </div>
    </div>
  );
};