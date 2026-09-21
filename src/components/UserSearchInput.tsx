import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { PublicUserProfile } from '../types/user';

const DEFAULT_ELIGIBLE_ROLES: PublicUserProfile['role'][] = ['student', 'organizer'];

interface UserSearchInputProps {
  currentUserId: string;
  selectedUserId?: string;
  selectedUserName?: string;
  onSelectUser: (user: { uid: string; displayName: string } | null) => void;
  eligibleRoles?: PublicUserProfile['role'][];
}

export const UserSearchInput: React.FC<UserSearchInputProps> = ({
  currentUserId,
  selectedUserId,
  selectedUserName,
  onSelectUser,
  eligibleRoles = DEFAULT_ELIGIBLE_ROLES,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<PublicUserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const term = searchTerm.trim();
        const q = query(
          collection(db, 'users_public'),
          where('membershipStatus', '==', 'APPROVED'),
        );

        const [snap, contactsSnap] = await Promise.all([
          getDocs(q),
          getDocs(collection(db, 'contacts')),
        ]);
        const linkedUserIds = new Set(
          contactsSnap.docs
            .map((contact) => contact.data().linkedUserId)
            .filter((uid): uid is string => typeof uid === 'string'),
        );
        const users: PublicUserProfile[] = [];
        
        snap.forEach((doc) => {
          const data = doc.data() as PublicUserProfile;
          // Exclude self from search results
          if (
            data.uid !== currentUserId &&
            eligibleRoles.includes(data.role) &&
            data.membershipStatus === 'APPROVED' &&
            data.displayName.toLowerCase().startsWith(term.toLowerCase()) &&
            !linkedUserIds.has(data.uid)
          ) {
            users.push(data);
          }
        });

        setResults(users.slice(0, 5));
        setIsOpen(true);
      } catch (err) {
        console.error('Error searching users:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchUsers, 300); // 300ms debounce
    return () => clearTimeout(timer);
  }, [searchTerm, currentUserId, eligibleRoles]);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="app-label">
        Select student or organizer to disciple
      </label>

      {selectedUserId ? (
        <div className="flex items-center justify-between rounded-app-md border border-primary-muted bg-primary-soft p-2.5">
          <span className="text-sm font-medium text-text">
            Selected: {selectedUserName || 'User'}
          </span>
          <button
            type="button"
            onClick={() => onSelectUser(null)}
            className="app-button-text min-h-8 px-1 text-xs text-error hover:bg-error-soft hover:text-error"
          >
            Clear / Change
          </button>
        </div>
      ) : (
        <div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type a name to search..."
            className="app-input"
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
                      onSelectUser({ uid: user.uid, displayName: user.displayName });
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