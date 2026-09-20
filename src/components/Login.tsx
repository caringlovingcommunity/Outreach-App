import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { isFirebaseConfigured } from '../services/firebase';
import { Loader2, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const { signInWithGoogle } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setErrorMessage(null);
      setIsSubmitting(true);
      await signInWithGoogle();
    } catch (err: any) {
      if (
        err?.code !== 'auth/popup-closed-by-user' &&
        err?.code !== 'auth/cancelled-popup-request' &&
        err?.code !== 'auth/popup-blocked'
      ) {
        if (err?.code === 'auth/unauthorized-domain') {
          setErrorMessage(
            'This domain is not authorized in Firebase Auth. In Firebase Console > Authentication > Settings > Authorized Domains, add this domain.'
          );
        } else if (err?.code?.includes('api-key-not-valid') || err?.message?.includes('api-key-not-valid')) {
          setErrorMessage(
            'Invalid Firebase API Key. Please verify your VITE_FIREBASE_API_KEY environment variable.'
          );
        } else {
          setErrorMessage(
            err?.message || 'Unable to sign in with Google. Please check your credentials.'
          );
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <div
        id="login-page-container"
        className="app-shell flex flex-col items-center justify-center px-4 py-8 sm:py-12"
      >
        <div
          id="login-card"
          className="w-full max-w-md rounded-app-lg border border-border bg-surface p-8 shadow-app-md"
        >
        <img
          src="/Picture1.png"
          alt="Students connecting through outreach"
          className="mb-0 w-full max-w-xl object-contain"
        />

        
        {/* Header Section */}
        <div id="login-header" className="flex flex-col items-center text-center space-y-3">
          <div
            id="brand-icon-wrapper"
            className="flex h-20 w-35 items-center justify-center rounded-xl"
          >
              <img
                src="/CLC.png"
                alt="CLC"
                className="h-full w-full object-cover"
              />
          </div>

          <div className="space-y-1">
            <h1
              id="login-title"
              className="text-2xl font-bold text-text"
            >
              CLC Outreach App
            </h1>
            <p
              id="login-subtitle"
              className="max-w-xs text-sm text-muted"
            >
              Manage and coordinate outreach slots
            </p>
          </div>
        </div>

        {/* Missing Config Notification if env vars aren't populated */}
        {!isFirebaseConfigured && (
          <div
            id="firebase-config-notice"
            className="app-alert-warning mt-6 text-xs"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <span className="font-medium">Firebase configuration needed:</span> Set your{' '}
              <code className="rounded bg-surface px-1 py-0.5 font-mono text-[11px]">
                VITE_FIREBASE_*
              </code>{' '}
              environment variables in your project settings to complete Google sign-in.
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div
            id="login-error-banner"
            className="app-alert-error mt-4 text-xs"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Actions */}
        <div id="login-actions" className="mt-8">
          <button
            id="google-signin-button"
            type="button"
            onClick={handleSignIn}
            disabled={isSubmitting}
            className="app-button-secondary group relative w-full gap-3 px-5 py-3"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>
        </div>

        {/* Footer Note */}
        <p
          id="login-footnote"
          className="mt-6 text-center text-xs text-muted"
        >
          Welcome!! This app is designed for CLC organizers to manage outreach slots. Please sign in with your Google account to continue.
        </p>
      </div>
    </div>
  );
};
