import React, { useEffect, useState } from 'react';
import { Loader2, Search, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  approveMember,
  rejectMember,
  filterMember,
  resetMemberToPending,
  subscribeToApprovedMembers,
  subscribeToPendingMembers,
  subscribeToRejectedMembers,
  subscribeToFilteredMembers,
  updateMemberRole,
} from '../services/organizerService';
import type { ApprovalMember } from '../services/organizerService';
import { StudentApprovalCard } from './organizer/StudentApprovalCard';

const ADMIN_UID = 'REPLACE_WITH_DEVELOPER_UID';
type ApprovalTab = 'pending' | 'approved' | 'rejected' | 'filtered';

export const OrganizerApprovalsPage: React.FC = () => {
  const { user } = useAuth();
  const [pendingMembers, setPendingMembers] = useState<ApprovalMember[]>([]);
  const [approvedMembers, setApprovedMembers] = useState<ApprovalMember[]>([]);
  const [rejectedMembers, setRejectedMembers] = useState<ApprovalMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<ApprovalMember[]>([]);
  const [activeTab, setActiveTab] = useState<ApprovalTab>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

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
    const unsubscribeFiltered = subscribeToFilteredMembers((members) => {
      setFilteredMembers(members);
      setLoading(false);
    }, handleError);
    return () => {
      unsubscribePending();
      unsubscribeApproved();
      unsubscribeRejected();
      unsubscribeFiltered();
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

  const renderMemberGroup = (status: ApprovalTab, label: string, members: ApprovalMember[]) => (
    <section aria-labelledby={`approval-group-${status}`}>
      <div className="flex items-center justify-between">
        <h3 id={`approval-group-${status}`} className="text-lg font-bold text-text">{label}</h3>
        <span className="text-xs text-muted">{members.length}</span>
      </div>
      {members.length === 0 ? (
        <div className="app-empty-state mt-2 min-h-32 p-6">
          <Users className="h-7 w-7 text-muted" />
          <p className="mt-2 text-sm text-muted">No {label.toLowerCase()}.</p>
        </div>
      ) : (
        <div className="mt-2 divide-y divide-border border-y border-border px-4 sm:px-6">
          {members.map((member) => (
            <StudentApprovalCard
              key={member.uid}
              member={member}
              isPending={status === 'pending'}
              canManageRoles={status === 'approved' && user?.uid === ADMIN_UID}
              onApprove={() => void runUpdate(member.uid, () => approveMember(member.uid, user?.uid || '', user?.email || ''))}
              onReject={() => {
                if (window.confirm(`Reject ${member.displayName || 'this member'}?`)) void runUpdate(member.uid, () => rejectMember(member.uid));
              }}
              onReset={() => {
                if (window.confirm(`Revoke ${member.displayName || 'this member'} status and return them to pending?`)) void runUpdate(member.uid, () => resetMemberToPending(member.uid));
              }}
              onFilter={() => {
                if (window.confirm(`Filter ${member.displayName || 'this member'}?`)) void runUpdate(member.uid, () => filterMember(member.uid));
              }}
              onRoleChange={(role) => void runUpdate(member.uid, () => updateMemberRole(member.uid, role))}
            />
          ))}
        </div>
      )}
    </section>
  );

  const approvalTabs: { id: ApprovalTab; label: string; members: ApprovalMember[] }[] = [
    { id: 'pending', label: 'Pending', members: pendingMembers },
    { id: 'approved', label: 'Approved', members: approvedMembers },
    { id: 'rejected', label: 'Rejected', members: rejectedMembers },
    { id: 'filtered', label: 'Filtered', members: filteredMembers },
  ];
  const activeGroup = approvalTabs.find((tab) => tab.id === activeTab) || approvalTabs[0];
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleMembers = normalizedSearch
    ? activeGroup.members.filter((member) =>
      [member.displayName, member.email, member.course, member.faculty]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedSearch)),
    )
    : activeGroup.members;

  return (
    <section className="mx-auto max-w-5xl space-y-7 pb-6">
      <div className="-mx-4 -mt-6 bg-primary px-4 py-7 text-white sm:-mx-6 sm:-mt-8 sm:px-8">
        <p className="text-2xl font-bold sm:text-3xl">Member Approvals</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">Review Vision Casting attendees and manage access to the outreach team.</p>
      </div>

      <div className="grid grid-cols-4 border-b border-border" role="tablist" aria-label="Member approval statuses">
        {approvalTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-12 border-b-2 px-2 text-xs font-semibold transition-colors sm:text-sm ${
              activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-text'
            }`}
          >
            {tab.label} ({tab.members.length})
          </button>
        ))}
      </div>

      {error && <div className="app-alert-error">{error}</div>}
      {loading ? <div className="app-loading-state min-h-48"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : <div>
        {activeGroup.members.length > 0 && (
          <label className="relative mt-5 mb-5 block">
            <span className="sr-only">Search {activeGroup.label.toLowerCase()}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={`Search ${activeGroup.label.toLowerCase()}`}
              className="app-input pl-10"
            />
          </label>
        )}
        {activeGroup.members.length === 0 ? renderMemberGroup(activeGroup.id, activeGroup.label, activeGroup.members) : visibleMembers.length > 0 ? renderMemberGroup(activeGroup.id, activeGroup.label, visibleMembers) : (
          <div className="app-empty-state mt-5 min-h-32">
            <Users className="h-7 w-7 text-muted" />
            <p className="mt-2 text-sm text-muted">No members match your search.</p>
          </div>
        )}
        {updatingUid && <p className="text-xs text-muted">Saving member update...</p>}
      </div>}
    </section>
  );
};
