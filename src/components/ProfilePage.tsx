import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit3, GraduationCap, Mail, MapPin, Phone, Shield } from 'lucide-react';
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
  const [isEditing, setIsEditing] = useState<boolean>(true);
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

          const profileComplete = Boolean(
            profile.displayName &&
            profile.faculty &&
            profile.course &&
            profile.yearOfStudy &&
            profile.phone &&
            profile.college
          );

          // Organizers can use the profile page without completing student-only fields.
          setIsEditing(currentUser.role !== 'organizer' && !profileComplete);
        } else {
          setIsEditing(currentUser.role !== 'organizer');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setMessage({ type: 'error', text: 'Failed to load profile details.' });
        setIsEditing(currentUser.role !== 'organizer');
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
      setIsEditing(false);
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

  if (!isEditing) {
    return (
      <div className="min-h-screen bg-gray-100 px-0 pb-10 sm:px-4 sm:pt-6">
        <div className="mx-auto max-w-3xl overflow-hidden bg-white shadow-sm sm:rounded-2xl sm:border sm:border-gray-200">
          <div className="relative h-32 bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-500 sm:h-44">
            <div className="absolute -bottom-14 left-5 sm:left-8">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName}
                  className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-md sm:h-32 sm:w-32"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-indigo-100 text-3xl font-bold text-indigo-700 shadow-md sm:h-32 sm:w-32">
                  {displayName.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
          </div>

          <div className="px-5 pb-7 pt-20 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{displayName || currentUser.displayName}</h1>
                <p className="mt-1 text-sm text-gray-500">CLC Outreach participant</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                  {faculty && <span className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-700">{faculty}</span>}
                  {yearOfStudy && <span className="rounded-full bg-gray-100 px-3 py-1">Year {yearOfStudy}</span>}
                  {college && <span className="rounded-full bg-gray-100 px-3 py-1">{college}</span>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMessage(null);
                  setIsEditing(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
              >
                <Edit3 className="h-4 w-4" />
                Edit Profile
              </button>
            </div>

            {message && (
              <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800">
                {message.text}
              </div>
            )}

            <div className="mt-8 border-t border-gray-100 pt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Personal details</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 text-sm text-gray-700"><Mail className="h-5 w-5 text-gray-400" /><span>{currentUser.email}</span></div>
                {phone && <div className="flex items-center gap-3 text-sm text-gray-700"><Phone className="h-5 w-5 text-gray-400" /><span>{phone}</span></div>}
                {course && <div className="flex items-center gap-3 text-sm text-gray-700"><GraduationCap className="h-5 w-5 text-gray-400" /><span>{course}</span></div>}
                {hometown && <div className="flex items-center gap-3 text-sm text-gray-700"><MapPin className="h-5 w-5 text-gray-400" /><span>{hometown}</span></div>}
                <div className="flex items-center gap-3 text-sm text-gray-700"><Shield className="h-5 w-5 text-gray-400" /><span className="capitalize">{currentUser.role}</span></div>
              </div>
            </div>

            <button type="button" onClick={onBack} className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>
          </div>
        </div>
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