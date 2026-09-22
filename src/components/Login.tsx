import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { isFirebaseConfigured } from '../services/firebase';
import { AlertCircle, ArrowRight, Loader2, UsersRound } from 'lucide-react';

export const Login: React.FC = () => {
  const { signInWithGoogle } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
//   const [menuOpen, setMenuOpen] = useState(false);

  const handleSignIn = async () => {
    try { setErrorMessage(null); setIsSubmitting(true); await signInWithGoogle(); }
    catch (err: any) {
      if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/popup-blocked'].includes(err?.code)) {
        if (err?.code === 'auth/unauthorized-domain') setErrorMessage('This domain is not authorized in Firebase Auth. Add it in Firebase Console > Authentication > Settings > Authorized Domains.');
        else if (err?.code?.includes('api-key-not-valid') || err?.message?.includes('api-key-not-valid')) setErrorMessage('Invalid Firebase API Key. Please verify your VITE_FIREBASE_API_KEY environment variable.');
        else setErrorMessage(err?.message || 'Unable to sign in with Google. Please check your credentials.');
      }
    } finally { setIsSubmitting(false); }
  };

  const scrollToLogin = () => { document.getElementById('signup-portal')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };

  return <div id="login-page-container" className="login-landing app-shell">
    {/* <header className="login-nav"><a className="login-brand" href="#hero"><img src="/CLC.png" alt="CLC" /><span><strong>CLC Outreach App</strong><small>Caring Loving Community · UNIMAS</small></span></a><nav className={menuOpen ? 'login-nav-links is-open' : 'login-nav-links'}><a href="#hero" onClick={() => setMenuOpen(false)}>Home</a><a href="#activities" onClick={() => setMenuOpen(false)}>Activities</a><button type="button" className="login-nav-cta" onClick={scrollToLogin}>Sign in <ArrowRight /></button></nav><button type="button" className="login-menu-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X /> : <Menu />}</button></header> */}
    <main>
      <section id="hero" className="login-hero login-section-reveal"><div className="login-hero-copy"><h1>Connect, serve,<br /><em>build movement.</em></h1><p>We are a platform that focus on following Jesus and helping people to follow Jesus (Discipleship). Let's journey together drawing each other to Christ!</p><button type="button" className="login-primary-cta" onClick={scrollToLogin}>Join the community <ArrowRight /></button></div><div className="login-hero-art"><div className="login-hero-ring login-hero-ring-one" /><div className="login-hero-ring login-hero-ring-two" /><img src="/Picture1.png" alt="Students connecting through outreach" /><span className="login-float-card"><UsersRound /><strong>One community</strong><small>Journey of Faith</small></span></div></section>
      <section id="signup-portal" className="login-portal login-section-reveal"><div className="login-portal-copy"><span className="login-section-label">CARING LOVING COMMUNITY PORTAL</span><h2>Your next step starts here.</h2><p>Sign in to discover outreach activities, and connect with each other serving alongside you.</p></div><div className="login-signin-card"><div className="login-signin-heading"><div><span className="login-card-kicker mb-3 block">WELCOME IN TO OUR</span><h3><strong>CLC OUTREACH APP</strong></h3></div><span/></div>{!isFirebaseConfigured && <div id="firebase-config-notice" className="app-alert-warning mt-5 text-xs"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><div><span className="font-medium">Firebase configuration needed:</span> Set your <code>VITE_FIREBASE_*</code> environment variables.</div></div>}{errorMessage && <div id="login-error-banner" className="app-alert-error mt-4 text-xs"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{errorMessage}</span></div>}<button id="google-signin-button" type="button" onClick={handleSignIn} disabled={isSubmitting} className="app-button-secondary group relative mt-6 w-full gap-3 px-5 py-3">{isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin text-primary" /><span>Signing in...</span></> : <><svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" /></svg><span>Sign in with Google</span></>}</button><p id="login-footnote" className="login-signin-note">This app is designed for CLC members to manage outreach activities.</p></div></section>
      <section className="login-bottom-cta mt-50"><h2>Ready to journey and serve?</h2><p>Sign in to submit your availability or join our discipleship journey.</p><button type="button" className="login-light-cta" onClick={scrollToLogin}>Register your availability <ArrowRight /></button></section>
    </main><footer className="login-footer">CLC UNIMAS · Caring Loving Community </footer>
  </div>;
};
