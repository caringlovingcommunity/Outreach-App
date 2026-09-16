import React, { useState, useEffect } from 'react';
import { getCompleteUserProfile, updateUserProfile, type UpdateProfileInput } from '../services/userService';
import { UserSearchInput } from '../components/UserSearchInput';
import { FACULTIES, COLLEGES, YEARS_OF_STUDY, GENDERS } from '../constants/unimasData';
import type { FacultyCode, CollegeName } from '../types/user';
import type { UserProfile } from '../types';

interface ProfilePageProps {
  user: UserProfile;
  onBack: () => void;
  onProfileUpdated: (updatedName: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onBack, onProfileUpdated }) => {
  const currentUser = user;

  // Loading & Feedback States
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [displayName, setDisplayName] = useState<string>('');
  const [faculty, setFaculty] = useState<FacultyCode | ''>('');
  const [course, setCourse] = useState<string>('');
  const [yearOfStudy, setYearOfStudy] = useState<number | ''>('');
  
  const [phone, setPhone] = useState<string>('');
  const [college, setCollege] = useState<CollegeName | ''>('');
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('');
  const [race, setRace] = useState<string>('');
  const [hometown, setHometown] = useState<string>('');
  
  const [invitedBy, setInvitedBy] = useState<{ uid: string; displayName: string } | null>(null);

  // 1. Fetch user data on mount
  useEffect(() => {
    if (!currentUser) return;

    const loadProfile = async () => {
      setLoading(true);
      try {
        const profile = await getCompleteUserProfile(currentUser.uid);
        if (profile) {
          setDisplayName(profile.displayName || currentUser.displayName || '');
          setFaculty(profile.faculty || '');
          setCourse(profile.course || '');
          setYearOfStudy(profile.yearOfStudy || '');
          
          setPhone(profile.phone || '');
          setCollege(profile.college || '');
          setGender(profile.gender || '');
          setRace(profile.race || '');
          setHometown(profile.hometown || '');

          if (profile.invitedByUserId) {
            setInvitedBy({
              uid: profile.invitedByUserId,
              displayName: profile.invitedByName || 'Selected Student',
            });
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setMessage({ type: 'error', text: 'Failed to load profile details.' });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [currentUser]);

  // 2. Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!displayName.trim()) {
      setMessage({ type: 'error', text: 'Display Name cannot be empty.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    const payload: UpdateProfileInput = {
      displayName: displayName.trim(),
      faculty: faculty ? (faculty as FacultyCode) : undefined,
      course: course.trim() || undefined,
      yearOfStudy: yearOfStudy ? (Number(yearOfStudy) as 1 | 2 | 3 | 4 | 5) : undefined,
      photoURL: currentUser.photoURL || undefined,

      phone: phone.trim() || undefined,
      college: college ? (college as CollegeName) : undefined,
      gender: gender ? (gender as 'Male' | 'Female') : undefined,
      race: race.trim() || undefined,
      hometown: hometown.trim() || undefined,

      invitedByUserId: invitedBy?.uid || undefined,
      invitedByName: invitedBy?.displayName || undefined,
    };

    try {
      await updateUserProfile(currentUser.uid, payload);
      onProfileUpdated(displayName.trim());
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      console.error('Save failed:', err);
      setMessage({
        type: 'error',
        text: err.message || 'Failed to update profile. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        Back to Dashboard
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 p-6">
          <h1 className="text-xl font-bold text-gray-900">Profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            Update your profile details and UNIMAS academic information.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">

          {/* Feedback Banner */}
          {message && (
            <div
              className={`p-4 rounded-lg text-sm font-medium ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* SECTION 1: PUBLIC IDENTITY */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">
              1. Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={currentUser?.email || ''}
                  disabled
                  className="w-full px-3.5 py-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-lg text-sm cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: ACADEMIC DETAILS */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">
              2. Academic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Faculty <span className="text-red-500">*</span>
                </label>
                <select
                  value={faculty}
                  required
                  onChange={(e) => setFaculty(e.target.value as FacultyCode)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select Faculty...</option>
                  {FACULTIES.map((f) => (
                    <option key={f.code} value={f.code}>
                      {f.code} - {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course / Program <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={course}
                  required
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="e.g. Software Engineering"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year of Study <span className="text-red-500">*</span>
                </label>
                <select
                  value={yearOfStudy}
                  required
                  onChange={(e) => setYearOfStudy(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select Year...</option>
                  {YEARS_OF_STUDY.map((yr) => (
                    <option key={yr} value={yr}>
                      Year {yr}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* SECTION 3: CONTACT & HOUSING */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">
              3. Contact & College
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number / WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +60123456789"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Residential College <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={college}
                  onChange={(e) => setCollege(e.target.value as CollegeName)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select College...</option>
                  {COLLEGES.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* SECTION 4: DEMOGRAPHICS & REFERRAL */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">
              4. Secondary Details & Referral
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'Male' | 'Female')}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select Gender...</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Race / Ethnicity
                </label>
                <input
                  type="text"
                  value={race}
                  onChange={(e) => setRace(e.target.value)}
                  placeholder="e.g. Iban, Chinese, Malay"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hometown
                </label>
                <input
                  type="text"
                  value={hometown}
                  onChange={(e) => setHometown(e.target.value)}
                  placeholder="e.g. Kuching, Miri, KL"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

            </div>

            {/* Invited By Search Component */}
            {currentUser && (
              <UserSearchInput
                currentUserId={currentUser.uid}
                selectedUserId={invitedBy?.uid}
                selectedUserName={invitedBy?.displayName}
                onSelectUser={(selected) => setInvitedBy(selected)}
              />
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-4 border-t flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors text-sm"
            >
              {saving ? 'Saving Changes...' : 'Save Profile'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};