import React, { useState } from 'react';
import { CheckCircle2, LogOut, RefreshCw, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const PendingApprovalPage: React.FC = () => {
  const { user, logout, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const isRejected = user?.membershipStatus === 'REJECTED';
  const isFiltered = user?.membershipStatus === 'FILTERED';

  const checkStatus = async () => {
    setRefreshing(true);
    setMessage('');
    try {
      await refreshProfile();
      setMessage('Status refreshed.');
    } catch {
      setMessage('Unable to refresh status. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4 py-8">
      <section className="app-panel w-full max-w-md p-6 text-center sm:p-8">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${isRejected ? 'bg-error-soft text-error' : 'bg-primary-soft text-primary'}`}>
          {isRejected || isFiltered ? <XCircle className="h-7 w-7" /> : <CheckCircle2 className="h-7 w-7" />}
        </div>
        <h1 className="mt-5 text-xl font-bold text-text">Welcome to CLC Outreach</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {isFiltered
            ? 'Your account is inactive and has been filtered by an organizer. Please speak with an organizer if you believe this was a mistake.'
            : isRejected
            ? 'Your membership request was not approved. Please speak with an organizer if you believe this was a mistake.'
            : 'Your account is signed in. Please connect with an organizer during Vision Casting to activate your CLC member access.'}
        </p>
        <p className="mt-3 rounded-app-md bg-surface-muted px-3 py-2 text-xs text-muted">
          Approval status: <span className={`font-semibold ${isRejected || isFiltered ? 'text-error' : 'text-text'}`}>{isFiltered ? 'Filtered' : isRejected ? 'Rejected' : 'Pending'}</span>
        </p>
        {message && <p className="mt-4 text-xs text-muted">{message}</p>}
        <div className="mt-6 grid gap-2">
          <button type="button" onClick={() => void checkStatus()} disabled={refreshing} className="app-button-primary w-full">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Checking status...' : 'Refresh Status'}
          </button>
          <button type="button" onClick={() => void logout()} className="app-button-secondary w-full">
            <LogOut className="h-4 w-4" /> Sign out{user ? ` (${user.displayName})` : ''}
          </button>
        </div>
      </section>
    </main>
  );
};