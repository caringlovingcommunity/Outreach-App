import React, { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCompleteUserProfile } from '../services/userService';

interface Props {
  children: ReactNode;
}

export const RequireProfileComplete: React.FC<Props> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [profileLoading, setProfileLoading] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || user.role === 'organizer') {
      setProfileLoading(false);
      setIsProfileComplete(user?.role === 'organizer' ? true : null);
      return;
    }

    let isMounted = true;
    setProfileLoading(true);

    getCompleteUserProfile(user.uid)
      .then((profile) => {
        if (!isMounted) return;
        setIsProfileComplete(Boolean(
          profile?.displayName &&
          profile.faculty &&
          profile.course &&
          profile.yearOfStudy &&
          profile.phone &&
          profile.college &&
          profile.gender &&
          profile.race &&
          profile.hometown
        ));
      })
      .catch(() => {
        if (isMounted) setIsProfileComplete(false);
      })
      .finally(() => {
        if (isMounted) setProfileLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  if (loading || profileLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 1. Not logged in -> Go to Login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role === 'organizer') {
    return children;
  }

  // 2. Logged in, but profile incomplete -> Force to /profile
  if (user && isProfileComplete === false && location.pathname !== '/profile') {
    return <Navigate to="/profile" state={{ message: "Please complete your details first!" }} replace />;
  }

  return children;
};