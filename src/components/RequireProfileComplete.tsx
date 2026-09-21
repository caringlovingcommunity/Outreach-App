import React, { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PendingApprovalPage } from './PendingApprovalPage';
import { getCompleteUserProfile } from '../services/userService';
import { isProfileComplete } from '../utils/profile';

interface Props {
  children: ReactNode;
}

export const RequireProfileComplete: React.FC<Props> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (!user || user.role === 'organizer' || user.role === 'admin' || user.visionCastingAccepted !== true) {
      setCheckingProfile(false);
      return;
    }

    let isMounted = true;
    void getCompleteUserProfile(user.uid).then((profile) => {
      if (isMounted) {
        setComplete(isProfileComplete(profile));
        setCheckingProfile(false);
      }
    }).catch(() => {
      if (isMounted) {
        setComplete(false);
        setCheckingProfile(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== 'organizer' && user.role !== 'admin' && user.visionCastingAccepted !== true) {
    return <PendingApprovalPage />;
  }

  if (checkingProfile) {
    return <div className="app-shell flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>;
  }

  if (user.role !== 'organizer' && user.role !== 'admin' && !complete) {
    return <Navigate to="/register" state={{ from: location }} replace />;
  }

  return children;
};

export const RequireRegistration: React.FC<Props> = ({ children }) => {
  const { user, loading } = useAuth();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (!user || user.role === 'organizer' || user.role === 'admin' || user.visionCastingAccepted !== true) {
      setCheckingProfile(false);
      return;
    }

    let isMounted = true;
    void getCompleteUserProfile(user.uid).then((profile) => {
      if (isMounted) {
        setComplete(isProfileComplete(profile));
        setCheckingProfile(false);
      }
    }).catch(() => {
      if (isMounted) {
        setComplete(false);
        setCheckingProfile(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [user]);

  if (loading) {
    return <div className="app-shell flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'organizer' || user.role === 'admin') return <Navigate to="/" replace />;
  if (user.visionCastingAccepted !== true) return <PendingApprovalPage />;
  if (checkingProfile) {
    return <div className="app-shell flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>;
  }
  if (complete) return <Navigate to="/" replace />;

  return children;
};