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
    <div className="app-modal-backdrop items-center justify-center">
      <div className="app-modal max-h-[85vh] space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold text-text">Semester Management</h3>
          </div>
          <button
            onClick={onClose}
            className="app-icon-button size-9"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="app-alert-error p-3 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Semester List */}
        <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            semesters.map((sem) => (
              <div
                key={sem.semesterId}
                className={`flex items-center justify-between rounded-app-md border p-3.5 transition-colors ${
                  sem.isActive
                    ? 'border-primary bg-primary-soft'
                    : 'border-border bg-surface-muted'
                }`}
              >
                <div>
                  <div className="text-sm font-bold text-text">{sem.name}</div>
                  <div className="mt-0.5 font-mono text-xs text-muted">{sem.semesterId}</div>
                </div>

                {sem.isActive ? (
                  <span className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-white">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleActivate(sem.semesterId)}
                    className="app-button-secondary min-h-9 px-3 py-1.5 text-xs"
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
          <form onSubmit={handleCreate} className="space-y-3 rounded-app-md border border-border bg-surface-muted p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text">Create New Semester</h4>
            
            <div>
              <label className="app-label">Semester ID (Unique Key)</label>
              <input
                type="text"
                placeholder="e.g. 2026-2027-SEM2"
                value={newSemId}
                onChange={(e) => setNewSemId(e.target.value)}
                className="app-input font-mono text-xs"
                required
              />
            </div>

            <div>
              <label className="app-label">Display Name</label>
              <input
                type="text"
                placeholder="e.g. 2026/2027 Semester 2"
                value={newSemName}
                onChange={(e) => setNewSemName(e.target.value)}
                className="app-input text-xs"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="makeActive"
                checked={makeActive}
                onChange={(e) => setMakeActive(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="makeActive" className="text-xs font-medium text-text">
                Set as active semester immediately
              </label>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="app-button-secondary flex-1 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="app-button-primary flex-1 py-2 text-xs"
              >
                {submitting ? 'Creating...' : 'Save Semester'}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="app-button-primary w-full"
          >
            <Plus className="w-4 h-4" />
            Create New Semester
          </button>
        )}

      </div>
    </div>
  );
};