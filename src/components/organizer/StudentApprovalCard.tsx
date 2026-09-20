import React from 'react';
import { Check, Loader2, Shield, UserRound, X } from 'lucide-react';
import type { ApprovalMember } from '../../services/organizerService';

interface StudentApprovalCardProps {
  member: ApprovalMember;
  isPending: boolean;
  canManageRoles: boolean;
  onApprove: () => void;
  onReject: () => void;
  onReset: () => void;
  onFilter: () => void;
  onRoleChange: (role: 'student' | 'organizer') => void;
}

export const StudentApprovalCard: React.FC<StudentApprovalCardProps> = ({
  member,
  isPending,
  canManageRoles,
  onApprove,
  onReject,
  onReset,
  onFilter,
  onRoleChange,
}) => (
  <article className="flex flex-col gap-4 border-b border-border py-4 sm:flex-row sm:items-center">
    <div className="flex min-w-0 flex-1 items-center gap-3">
      {member.photoURL ? (
        <img src={member.photoURL} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-border" />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <UserRound className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate font-semibold text-text">{member.displayName || 'Unnamed student'}</p>
        <p className="truncate text-sm text-muted">{member.email || 'Campus email unavailable'}</p>
        <p className="text-xs text-muted">{member.membershipStatus || 'Legacy profile'}{member.createdAt?.toDate ? ` · Joined ${member.createdAt.toDate().toLocaleDateString()}` : ''}</p>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      {isPending && (
        <>
          <button type="button" onClick={onApprove} className="app-button-primary" title="Approve member">
            <Check className="h-4 w-4" /> Approve
          </button>
          <button type="button" onClick={onReject} className="app-button-secondary text-error" title="Reject member">
            <X className="h-4 w-4" /> Reject
          </button>
        </>
      )}
      {!isPending && (
        <>
          {member.membershipStatus !== 'FILTERED' && <button type="button" onClick={onFilter} className="app-button-secondary text-error" title="Move member to filtered">Filter</button>}
          {canManageRoles && (
            <>
          <button type="button" onClick={onReset} className="app-button-secondary text-error" title="Revoke member status">
            Revoke status
          </button>
          <button type="button" onClick={() => onRoleChange('organizer')} disabled={member.role === 'organizer'} className="app-button-secondary disabled:opacity-50" title="Promote to organizer">
            <Shield className="h-4 w-4" /> Promote
          </button>
          <button type="button" onClick={() => onRoleChange('student')} disabled={member.role === 'student'} className="app-button-secondary disabled:opacity-50" title="Demote to student">
            {member.role === 'student' ? 'Student' : 'Demote'}
          </button>
            </>
          )}
        </>
      )}
      {!isPending && !canManageRoles && <button type="button" onClick={onReset} className="app-button-secondary text-error" title="Revoke member status">Revoke status</button>}
      {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted" aria-label="Updating member" />}
    </div>
  </article>
);
