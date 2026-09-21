import React from 'react';
import { Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { deleteUserProfiles, getAllApprovedUsers, getUserFullDetail, updateUserRole } from '../services/organizerService';
import type { UserProfile } from '../types';
import type { PublicUserProfile } from '../types/user';

interface AdminUserManagementPageProps {
  user: UserProfile;
}

export const AdminUserManagementPage: React.FC<AdminUserManagementPageProps> = ({ user }) => {
  const [users, setUsers] = useState<Array<PublicUserProfile & { email?: string }>>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user.role !== 'admin') return;
    getAllApprovedUsers()
      .then(async (profiles) => {
        const hydratedProfiles = await Promise.all(profiles.map(async (profile) => {
          const fullDetail = await getUserFullDetail(profile.uid);
          return {
            ...profile,
            email: fullDetail?.privateDetails?.email,
          };
        }));
        setUsers(hydratedProfiles);
      })
      .catch(() => setError('Unable to load approved users.'))
      .finally(() => setLoading(false));
  }, [user.role]);

  const visibleUsers = users.filter((member) =>
    [member.displayName, member.role].some((value) => value.toLowerCase().includes(search.toLowerCase())),
  );

  const changeRole = async (uid: string, role: 'student' | 'organizer' | 'admin') => {
    try {
      await updateUserRole(uid, role);
      setUsers((current) => current.map((member) => member.uid === uid ? { ...member, role } : member));
    } catch {
      setError('Unable to update this user role.');
    }
  };

  const deleteProfile = async (member: typeof users[number]) => {
    if (member.uid === user.uid || !window.confirm(`Delete the profile records for ${member.displayName}?`)) return;
    try {
      await deleteUserProfiles(member.uid);
      setUsers((current) => current.filter((entry) => entry.uid !== member.uid));
    } catch {
      setError('Unable to delete this user profile.');
    }
  };

  if (user.role !== 'admin') {
    return (
      <div className="app-alert-error mx-auto mt-12 max-w-xl flex-col p-6 text-center">
        <h2 className="text-lg font-bold">Access Restricted</h2>
        <p className="mt-2 text-sm">Only administrators can manage user accounts.</p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6 pb-6">
      <div className="-mx-4 -mt-6 bg-primary px-4 py-7 text-white sm:-mx-6 sm:-mt-8 sm:px-8">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">User Management</h1>
            <p className="mt-2 text-sm text-white/85 sm:text-base">
              Manage roles, profiles, disciplers, and account access.
            </p>
          </div>
        </div>
      </div>

      {error && <div className="app-alert-error">{error}</div>}
      <div className="app-panel p-4">
        <label className="app-label">Search users</label>
        <input className="app-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or role" />
      </div>
      {loading ? <div className="app-loading-state min-h-32">Loading users...</div> : (
        <div className="app-panel divide-y divide-border overflow-hidden">
          {visibleUsers.map((member) => (
            <div key={member.uid} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                {member.photoURL ? (
                  <img src={member.photoURL} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                    {member.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-text">{member.displayName}</p>
                  <p className="truncate text-sm text-muted">{member.email || 'Email not available'}</p>
                <p className="text-sm capitalize text-muted">{member.role}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <select className="app-input min-h-9 w-auto py-1 text-xs" value={member.role} onChange={(event) => void changeRole(member.uid, event.target.value as typeof member.role)} disabled={member.uid === user.uid}>
                  <option value="student">Student</option>
                  <option value="organizer">Organizer</option>
                  <option value="admin">Admin</option>
                </select>
                <button type="button" className="app-button-secondary text-error" onClick={() => void deleteProfile(member)} disabled={member.uid === user.uid}>Delete Profile</button>
              </div>
            </div>
          ))}
          {visibleUsers.length === 0 && <p className="p-6 text-sm text-muted">No approved users found.</p>}
        </div>
      )}
    </section>
  );
};
