import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface UserProfileData {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'student' | 'organizer';
  createdAt?: any;
}

interface ProfilePageProps {
  user: UserProfileData;
  onBack: () => void;
  onProfileUpdated: (updatedName: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onBack, onProfileUpdated }) => {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setMessage({ type: 'error', text: 'Display name cannot be empty.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const userRef = doc(db, 'users_public', user.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        updatedAt: new Date(),
      });

      onProfileUpdated(displayName.trim());
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      console.error('Error updating profile:', err);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Top Bar Navigation */}
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        ← Back to Dashboard
      </button>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Profile</h1>

        {message && (
          <div
            className={`p-4 mb-6 rounded-md text-sm ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Profile Picture */}
          <div className="flex items-center space-x-4">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className="w-16 h-16 rounded-full border" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-bold">
                {user.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500">Profile picture managed via Google Account</p>
            </div>
          </div>

          {/* Account Role Badge */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Account Role</label>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
              user.role === 'organizer' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {user.role.toUpperCase()}
            </span>
          </div>

          {/* Display Name Input */}
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          {/* Email Address (Read-Only) */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={user.email}
              disabled
              className="w-full p-2.5 border border-gray-200 bg-gray-50 text-gray-500 rounded-md cursor-not-allowed"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};