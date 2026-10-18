import React, { useEffect, useState } from 'react';
import { Loader2, UserRound, X } from 'lucide-react';
import { getContactById } from '../../services/contactsService';
import { getUserFullDetail } from '../../services/organizerService';
import { JOURNEY_OF_FAITH_STEPS } from '../../types';
import type { Contact } from '../../types';
import type { DirectoryUser } from '../../services/organizerService';
import type { DiscipleshipNode } from '../../types/discipleship';

interface NodeProfileDrawerProps {
  node: DiscipleshipNode;
  onClose: () => void;
}

const Field: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div>
    <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</dt>
    <dd className="mt-0.5 text-sm text-text">{value || <span className="text-subtle">—</span>}</dd>
  </div>
);

const GOSPEL_LABELS: Record<string, string> = {
  not_started: 'Not started',
  gospel_conversation: 'Gospel conversation',
  gospel_presentation: 'Gospel presentation',
};

const RESPONSE_LABELS: Record<string, string> = {
  pray_receive_christ: 'Pray to receive Christ',
  already_christian: 'Already a Christian',
  not_ready: 'Not ready yet',
  say_yes_follow_up: 'Said yes to follow-up',
};

export const NodeProfileDrawer: React.FC<NodeProfileDrawerProps> = ({ node, onClose }) => {
  const [member, setMember] = useState<DirectoryUser | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = node.nodeType === 'user'
      ? getUserFullDetail(node.refId).then((detail) => { if (active) setMember(detail); })
      : getContactById(node.refId).then((record) => { if (active) setContact(record); });

    void load
      .catch(() => { if (active) setError('Unable to load this profile.'); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [node.nodeType, node.refId]);

  const completedSteps = contact
    ? JOURNEY_OF_FAITH_STEPS.filter((step) => contact.followUpProgress?.[step]).length
    : 0;

  return (
    <div className="app-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="app-modal mx-auto mt-auto w-full max-w-lg space-y-4 sm:mt-0"
        role="dialog"
        aria-modal="true"
        aria-label={`${node.displayName} profile`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-sm font-bold text-primary">
              {node.photoUrl
                ? <img src={node.photoUrl} alt="" className="h-full w-full object-cover" />
                : node.nodeType === 'user' ? <UserRound className="h-5 w-5" /> : node.displayName.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-text">{node.displayName}</h2>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {node.nodeType === 'user' ? 'Member profile' : 'Contact profile'}
              </p>
            </div>
          </div>
          <button type="button" className="app-icon-button" onClick={onClose} aria-label="Close profile">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-32 items-center justify-center text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <p className="app-alert-error" role="alert">{error}</p>
        ) : member ? (
          <dl className="grid grid-cols-2 gap-3">
            <Field label="Role" value={member.role} />
            <Field label="Membership" value={member.membershipStatus} />
            <Field label="Faculty" value={member.faculty} />
            <Field label="Course" value={member.course} />
            <Field label="Year" value={member.yearOfStudy} />
            <Field label="College" value={member.privateDetails?.college} />
            <Field label="Hometown" value={member.privateDetails?.hometown} />
            <Field label="Invited by" value={member.privateDetails?.invitedByName} />
            <Field label="Email" value={member.privateDetails?.email} />
            <Field label="Phone" value={member.privateDetails?.phone} />
          </dl>
        ) : contact ? (
          <dl className="grid grid-cols-2 gap-3">
            <Field label="Gender" value={contact.gender === 'male' ? 'Male' : 'Female'} />
            <Field label="Gospel status" value={GOSPEL_LABELS[contact.gospelStatus] ?? contact.gospelStatus} />
            <Field
              label="Response"
              value={contact.responseStatuses?.length
                ? contact.responseStatuses.map((status) => RESPONSE_LABELS[status] ?? status).join(', ')
                : undefined}
            />
            <Field label="Journey of faith" value={`${completedSteps} of ${JOURNEY_OF_FAITH_STEPS.length} steps`} />
            <Field label="Contact date" value={contact.contactDate} />
            <Field label="Phone" value={contact.phoneNumber} />
            <Field label="Shared by" value={contact.createdByName} />
            <Field label="Outreach partners" value={contact.outreachPartnerNames?.join(', ')} />
            <Field label="Linked account" value={contact.linkedUserId ? 'Linked to a member account' : undefined} />
            <Field label="Remarks" value={contact.remarks} />
          </dl>
        ) : (
          <p className="text-sm text-muted">No profile record was found for this person.</p>
        )}
      </div>
    </div>
  );
};
