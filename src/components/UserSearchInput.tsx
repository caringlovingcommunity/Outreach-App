import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { PublicUserProfile } from '../types/user';

interface UserSearchInputProps {
  currentUserId: string;
  selectedUserId?: string;
  selectedUserName?: string;
  onSelectUser: (user: { uid: string; displayName: string } | null) => void;
}

export const UserSearchInput: React.FC<UserSearchInputProps> = ({
  currentUserId,
  selectedUserId,
  selectedUserName,
  onSelectUser,
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
          where('displayName', '>=', term),
          where('displayName', '<=', term + '\uf8ff'),
          limit(5)
        );

        const snap = await getDocs(q);
        const users: PublicUserProfile[] = [];
        
        snap.forEach((doc) => {
          const data = doc.data() as PublicUserProfile;
          // Exclude self from search results
          if (data.uid !== currentUserId) {
            users.push(data);
          }
        });

        setResults(users);
        setIsOpen(true);
      } catch (err) {
        console.error('Error searching users:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchUsers, 300); // 300ms debounce
    return () => clearTimeout(timer);
  }, [searchTerm, currentUserId]);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Invited By (Optional)
      </label>

      {selectedUserId ? (
        <div className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-900">
            Selected: {selectedUserName || 'User'}
          </span>
          <button
            type="button"
            onClick={() => onSelectUser(null)}
            className="text-xs font-semibold text-red-600 hover:text-red-800"
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
            placeholder="Type student name to search..."
            className="w-full px-3.5 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />

          {isOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {loading ? (
                <div className="p-3 text-xs text-gray-500 text-center">Searching...</div>
              ) : results.length === 0 ? (
                <div className="p-3 text-xs text-gray-500 text-center">No students found</div>
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
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-sm border-b last:border-0"
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {user.displayName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{user.displayName}</div>
                      {user.faculty && (
                        <div className="text-xs text-gray-500">{user.faculty}</div>
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