import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { PublicUserProfile } from '../types/user';

const DEFAULT_ELIGIBLE_ROLES: PublicUserProfile['role'][] = ['student', 'organizer'];

interface UserSearchInputProps {
  currentUserId: string;
  selectedUserId?: string;
  selectedUserName?: string;
  selectedUsers?: Array<{ uid: string; displayName: string }>;
  onSelectUser?: (user: { uid: string; displayName: string } | null) => void;
  onSelectUsers?: (users: Array<{ uid: string; displayName: string }>) => void;
  eligibleRoles?: PublicUserProfile['role'][];
  label?: string;
  placeholder?: string;
  allowAlreadyLinkedUsers?: boolean;
  browseAllOnFocus?: boolean;
  disabled?: boolean;
  maxSelectedUsers?: number;
}

export const UserSearchInput: React.FC<UserSearchInputProps> = ({
  currentUserId,
  selectedUserId,
  selectedUserName,
  selectedUsers = [],
  onSelectUser,
  onSelectUsers,
  eligibleRoles = DEFAULT_ELIGIBLE_ROLES,
  label = 'Who invited you?',
  placeholder = 'Type a name to search...',
  allowAlreadyLinkedUsers = false,
  browseAllOnFocus = false,
  disabled = false,
  maxSelectedUsers,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<PublicUserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedUserIdsKey = selectedUsers.map((user) => user.uid).join('|');
  const isMultiSelect = Boolean(onSelectUsers);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle live query on users_public
  useEffect(() => {
    const term = searchTerm.trim();
    const browsingAll = browseAllOnFocus && isOpen && !term;
    const minimumQueryLength = browseAllOnFocus ? 1 : 2;

    if (!isOpen) return;

    if (disabled || (maxSelectedUsers !== undefined && selectedUsers.length >= maxSelectedUsers)) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    if (!browsingAll && term.length < minimumQueryLength) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersCollection = collection(db, 'users_public');
        const q = browseAllOnFocus
          ? query(usersCollection, where('membershipStatus', '==', 'APPROVED'), limit(100))
          : query(usersCollection, where('membershipStatus', '==', 'APPROVED'));

        const [snap, contactsSnap] = await Promise.all([
          getDocs(q),
          allowAlreadyLinkedUsers ? Promise.resolve(null) : getDocs(collection(db, 'contacts')),
        ]);
        const linkedUserIds = new Set(
          contactsSnap?.docs
            .map((contact) => contact.data().linkedUserId)
            .filter((uid): uid is string => typeof uid === 'string'),
        );
        const selectedUserIds = new Set(selectedUserIdsKey.split('|').filter(Boolean));
        const users: PublicUserProfile[] = [];
        
        snap.forEach((doc) => {
          const data = doc.data() as PublicUserProfile;
          // Exclude self from search results
          if (
            data.uid !== currentUserId &&
            eligibleRoles.includes(data.role) &&
            data.membershipStatus === 'APPROVED' &&
            data.displayName.toLowerCase().includes(term.toLowerCase()) &&
            (allowAlreadyLinkedUsers || !linkedUserIds.has(data.uid)) &&
            !selectedUserIds.has(data.uid)
          ) {
            users.push(data);
          }
        });

        users.sort((first, second) => first.displayName.localeCompare(second.displayName));
        setResults(users.slice(0, browsingAll ? 100 : 5));
        setIsOpen(true);
      } catch (err) {
        console.error('Error searching users:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchUsers, 300); // 300ms debounce
    return () => clearTimeout(timer);
  }, [searchTerm, currentUserId, eligibleRoles, allowAlreadyLinkedUsers, browseAllOnFocus, disabled, isOpen, maxSelectedUsers, selectedUsers.length, selectedUserIdsKey]);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="app-label">
        {label}
      </label>

      {selectedUserId && !isMultiSelect ? (
        <div className="flex items-center justify-between rounded-app-md border border-primary-muted bg-primary-soft p-2.5">
          <span className="text-sm font-medium text-text">
            Selected: {selectedUserName || 'User'}
          </span>
          <button
            type="button"
            onClick={() => onSelectUser?.(null)}
            className="app-button-text min-h-8 px-1 text-xs text-error hover:bg-error-soft hover:text-error"
          >
            Clear / Change
          </button>
        </div>
      ) : (
        <div>
          {isMultiSelect && selectedUsers.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <span key={user.uid} className="inline-flex items-center gap-1 rounded-app-md border border-primary-muted bg-primary-soft py-1 pl-2.5 pr-1 text-sm font-medium text-text">
                  {user.displayName}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelectUsers?.(selectedUsers.filter((selected) => selected.uid !== user.uid))}
                    className="app-icon-button size-7"
                    aria-label={`Remove ${user.displayName}`}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (browseAllOnFocus) setIsOpen(true);
            }}
            placeholder={maxSelectedUsers !== undefined && selectedUsers.length >= maxSelectedUsers ? `Up to ${maxSelectedUsers} selected` : placeholder}
            className="app-input"
            disabled={disabled || (maxSelectedUsers !== undefined && selectedUsers.length >= maxSelectedUsers)}
          />

          {isOpen && (
            <div className="absolute top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-app-md border border-border bg-surface shadow-app-md">
              {loading ? (
                <div className="p-3 text-center text-xs text-muted">Searching...</div>
              ) : results.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted">No eligible accounts found</div>
              ) : (
                results.map((user) => (
                  <button
                    key={user.uid}
                    type="button"
                    onClick={() => {
                        const selectedUser = { uid: user.uid, displayName: user.displayName };
                        if (onSelectUsers) {
                          onSelectUsers([...selectedUsers, selectedUser]);
                        } else {
                          onSelectUser?.(selectedUser);
                        }
                      setSearchTerm('');
                        setIsOpen(false);
                    }}
                    className="flex w-full min-w-0 items-start gap-3 border-b border-border px-4 py-2.5 text-left text-sm last:border-0 hover:bg-primary-soft"
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt=""
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                        {user.displayName.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="break-words font-medium text-text">{user.displayName}</div>
                      {user.faculty && (
                        <div className="break-words text-xs text-muted">{user.faculty}</div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};