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
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div className="min-h-screen bg-background px-0 pb-10 sm:px-4 sm:pt-6">
        <div className="mx-auto max-w-3xl overflow-hidden bg-surface shadow-app-sm sm:rounded-app-lg sm:border sm:border-border">
          <div className="relative h-32 bg-primary sm:h-44">
            <div className="absolute -bottom-14 left-5 sm:left-8">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName}
                  className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-md sm:h-32 sm:w-32"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-surface bg-primary-soft text-3xl font-bold text-primary shadow-app-md sm:h-32 sm:w-32">
                  {displayName.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
          </div>

          <div className="px-5 pb-7 pt-20 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-text">{displayName || currentUser.displayName}</h1>
                <p className="mt-1 text-sm text-muted">CLC Outreach participant</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-text">
                  {faculty && <span className="rounded-full bg-primary-soft px-3 py-1 font-semibold text-primary">{faculty}</span>}
                  {yearOfStudy && <span className="rounded-full bg-surface-muted px-3 py-1">Year {yearOfStudy}</span>}
                  {college && <span className="rounded-full bg-surface-muted px-3 py-1">{college}</span>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMessage(null);
                  setIsEditing(true);
                }}
                className="app-button-primary"
              >
                <Edit3 className="h-4 w-4" />
                Edit Profile
              </button>
            </div>

            {message && (
              <div className="app-alert-success mt-6 font-medium">
                {message.text}
              </div>
            )}

            <div className="mt-8 border-t border-border pt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Personal details</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 text-sm text-text"><Mail className="h-5 w-5 text-primary" /><span>{currentUser.email}</span></div>
                {phone && <div className="flex items-center gap-3 text-sm text-text"><Phone className="h-5 w-5 text-primary" /><span>{phone}</span></div>}
                {course && <div className="flex items-center gap-3 text-sm text-text"><GraduationCap className="h-5 w-5 text-primary" /><span>{course}</span></div>}
                {hometown && <div className="flex items-center gap-3 text-sm text-text"><MapPin className="h-5 w-5 text-primary" /><span>{hometown}</span></div>}
                <div className="flex items-center gap-3 text-sm text-text"><Shield className="h-5 w-5 text-primary" /><span className="capitalize">{currentUser.role}</span></div>
              </div>
            </div>

            <button type="button" onClick={onBack} className="app-button-text mt-8 px-0">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl py-2">
      <button
        type="button"
        onClick={onBack}
        className="app-button-text mb-4 px-0"
      >
        Back to Dashboard
      </button>

      <div className="app-panel overflow-hidden">
        
        {/* Header */}
        <div className="border-b border-border bg-surface-muted p-6">
          <h1 className="text-xl font-bold text-text">Profile</h1>
          <p className="mt-1 text-sm text-muted">
            Update your profile details and UNIMAS academic information.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">

          {/* Feedback Banner */}
          {message && (
            <div
              className={`p-4 rounded-lg text-sm font-medium ${
                message.type === 'success'
                  ? 'border border-success/20 bg-success-soft text-success'
                  : 'border border-error/20 bg-error-soft text-error'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* SECTION 1: PUBLIC IDENTITY */}
          <div>
            <h2 className="mb-4 border-b border-border pb-2 text-base font-semibold text-text">
              1. Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="app-label text-sm">
                  Display Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="app-input"
                />
              </div>

              <div>
                <label className="app-label text-sm">
                  Email Address
                </label>
                <input
                  type="email"
                  value={currentUser?.email || ''}
                  disabled
                  className="app-input cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: ACADEMIC DETAILS */}
          <div>
            <h2 className="mb-4 border-b border-border pb-2 text-base font-semibold text-text">
              2. Academic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div>
                <label className="app-label text-sm">
                  Faculty <span className="text-error">*</span>
                </label>
                <select
                  value={faculty}
                  required
                  onChange={(e) => setFaculty(e.target.value as FacultyCode)}
                  className="app-input"
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
                <label className="app-label text-sm">
                  Course / Program <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={course}
                  required
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="e.g. Software Engineering"
                  className="app-input"
                />
              </div>

              <div>
                <label className="app-label text-sm">
                  Year of Study <span className="text-error">*</span>
                </label>
                <select
                  value={yearOfStudy}
                  required
                  onChange={(e) => setYearOfStudy(e.target.value ? Number(e.target.value) : '')}
                  className="app-input"
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
            <h2 className="mb-4 border-b border-border pb-2 text-base font-semibold text-text">
              3. Contact & College
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div>
                <label className="app-label text-sm">
                  Phone Number / WhatsApp <span className="text-error">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +60123456789"
                  className="app-input"
                />
              </div>

              <div>
                <label className="app-label text-sm">
                  Residential College <span className="text-error">*</span>
                </label>
                <select
                  required
                  value={college}
                  onChange={(e) => setCollege(e.target.value as CollegeName)}
                  className="app-input"
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
            <h2 className="mb-4 border-b border-border pb-2 text-base font-semibold text-text">
              4. Secondary Details & Referral
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              
              <div>
                <label className="app-label text-sm">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'Male' | 'Female')}
                  className="app-input"
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
                <label className="app-label text-sm">
                  Race / Ethnicity
                </label>
                <input
                  type="text"
                  value={race}
                  onChange={(e) => setRace(e.target.value)}
                  placeholder="e.g. Iban, Chinese, Malay"
                  className="app-input"
                />
              </div>

              <div>
                <label className="app-label text-sm">
                  Hometown
                </label>
                <input
                  type="text"
                  value={hometown}
                  onChange={(e) => setHometown(e.target.value)}
                  placeholder="e.g. Kuching, Miri, KL"
                  className="app-input"
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
          <div className="flex justify-end border-t border-border pt-4">
            <button
              type="submit"
              disabled={saving}
              className="app-button-primary px-6"
            >
              {saving ? 'Saving Changes...' : 'Save Profile'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};