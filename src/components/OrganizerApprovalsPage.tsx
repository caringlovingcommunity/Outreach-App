import React, { useEffect, useState } from 'react';
import { Loader2, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  approveMember,
  rejectMember,
  resetMemberToPending,
  subscribeToApprovedMembers,
  subscribeToPendingMembers,
  subscribeToRejectedMembers,
  updateMemberRole,
} from '../services/organizerService';
import type { ApprovalMember } from '../services/organizerService';
import { StudentApprovalCard } from './organizer/StudentApprovalCard';

const ADMIN_UID = 'REPLACE_WITH_DEVELOPER_UID';
type ApprovalTab = 'pending' | 'approved' | 'rejected';

export const OrganizerApprovalsPage: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<ApprovalTab>('pending');
  const [pendingMembers, setPendingMembers] = useState<ApprovalMember[]>([]);
  const [approvedMembers, setApprovedMembers] = useState<ApprovalMember[]>([]);
  const [rejectedMembers, setRejectedMembers] = useState<ApprovalMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (listenerError: Error) => {
      console.error('Approval listener error:', listenerError);
      setError('Unable to load member approvals. Please try again.');
      setLoading(false);
    };
    const unsubscribePending = subscribeToPendingMembers((members) => {
      setPendingMembers(members);
      setLoading(false);
    }, handleError);
    const unsubscribeApproved = subscribeToApprovedMembers((members) => {
      setApprovedMembers(members);
      setLoading(false);
    }, handleError);
    const unsubscribeRejected = subscribeToRejectedMembers((members) => {
      setRejectedMembers(members);
      setLoading(false);
    }, handleError);
    return () => {
      unsubscribePending();
      unsubscribeApproved();
      unsubscribeRejected();
    };
  }, []);

  const runUpdate = async (uid: string, update: () => Promise<void>) => {
    try {
      setUpdatingUid(uid);
      setError(null);
      await update();
    } catch (updateError) {
      console.error('Approval update error:', updateError);
      setError('Unable to update this member. Please try again.');
    } finally {
      setUpdatingUid(null);
    }
  };

  const visibleMembers = tab === 'pending'
    ? pendingMembers
    : tab === 'approved'
      ? approvedMembers
      : rejectedMembers;

  return (
    <section className="space-y-6">
      <div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-primary">Member management</p>
        <h2 className="mt-1 text-2xl font-bold text-text">Member Approvals</h2>
        <p className="mt-1 text-sm text-muted">Review Vision Casting attendees and grant member access.</p>
      </div>

      <div className="grid grid-cols-3 rounded-app-md border border-border bg-surface-muted p-1">
        {(['pending', 'approved', 'rejected'] as ApprovalTab[]).map((currentTab) => (
          <button
            key={currentTab}
            type="button"
            onClick={() => setTab(currentTab)}
            className={`rounded-app-sm px-3 py-2 text-sm font-semibold ${tab === currentTab ? 'bg-surface text-primary shadow-app-sm' : 'text-muted'}`}
          >
            {currentTab === 'pending'
              ? `Pending (${pendingMembers.length})`
              : currentTab === 'approved'
                ? `Approved (${approvedMembers.length})`
                : `Rejected (${rejectedMembers.length})`}
          </button>
        ))}
      </div>

      {error && <div className="app-alert-error">{error}</div>}
      {loading ? (
        <div className="app-loading-state min-h-48"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
      ) : visibleMembers.length === 0 ? (
        <div className="app-panel flex min-h-48 flex-col items-center justify-center gap-2 p-6 text-center">
          <Users className="h-8 w-8 text-muted" />
          <p className="font-semibold text-text">No {tab === 'pending' ? 'pending approvals' : tab === 'approved' ? 'approved members' : 'rejected members'}.</p>
          <p className="text-sm text-muted">This list updates automatically when profiles change.</p>
        </div>
      ) : (
        <div className="app-panel px-4 sm:px-6">
          {visibleMembers.map((member) => (
            <StudentApprovalCard
              key={member.uid}
              member={member}
              isPending={tab === 'pending'}
              canManageRoles={tab === 'approved' && user?.uid === ADMIN_UID}
              onApprove={() => void runUpdate(member.uid, () => approveMember(member.uid, user?.uid || '', user?.email || ''))}
              onReject={() => {
                if (window.confirm(`Reject ${member.displayName || 'this member'}?`)) {
                  void runUpdate(member.uid, () => rejectMember(member.uid));
                }
              }}
              onReset={() => {
                if (window.confirm(`Revoke ${member.displayName || 'this member'} status and return them to pending?`)) {
                  void runUpdate(member.uid, () => resetMemberToPending(member.uid));
                }
              }}
              onRoleChange={(role) => void runUpdate(member.uid, () => updateMemberRole(member.uid, role))}
            />
          ))}
          {updatingUid && <p className="py-3 text-xs text-muted">Saving member update...</p>}
        </div>
      )}
    </section>
  );
};
