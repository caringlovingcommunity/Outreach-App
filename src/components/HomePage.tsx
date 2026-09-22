import React, { useState } from 'react';
import { BookOpen, CalendarClock, Eye, Flag } from 'lucide-react';

type HomeView = 'info' | 'calender';

const viewLabels: Record<HomeView, string> = {
  info: 'Info',
  calender: 'Calender',
};

type StrategyKey = 'win' | 'build' | 'train' | 'send';

const strategies: Record<StrategyKey, { label: string; title: string; text: string; detail: string; image: string }> = {
  win: { label: 'WIN', title: 'Sharing the Gospel', text: 'We share the Gospel both one-on-one and with groups, large and small, so that they can know Jesus Christ. We witness both with our life and our words.', detail: 'Proclaim Christ', image: '/Win.jpg' },
  build: { label: 'BUILD', title: 'Deep relationships', text: 'We journey with people so that they can follow Jesus well. This journey is called as Discipleship where believers will learn how to build deep relationship with God. This can be done by having one senior to disciple you and also joining our discipleship community.', detail: 'Journey with others', image: '/Build2.jpg' },
  train: { label: 'TRAIN', title: 'Equipping disciples', text: 'We train disciples so that their life can be transformed and they will know how to share gospel to others and also disciple others so that others will know how to follow Jesus well too.', detail: 'Leadership skills', image: '/Train.jpg' },
  send: { label: 'SEND', title: 'Beyond campus', text: 'Finally we want to send our disciples to do the same as what we have done to them, so that many more people can be blessed. It can be within the campus or even BEYOND the campus.', detail: 'Fulfill the Great Commission', image: '/Mission.png' },
};

interface HomePageProps {
  displayName: string;
  activeSemesterName?: string | null;
  semesterLoading?: boolean;
}

// Compact, operational landing view shown as the first tab of both dashboards.
export const HomePage: React.FC<HomePageProps> = ({
  displayName,
  activeSemesterName,
  semesterLoading,
}) => {
  const firstName = displayName?.trim().split(' ')[0] || 'there';
  const [activeView, setActiveView] = useState<HomeView>('info');
  const [activeStrategy, setActiveStrategy] = useState<StrategyKey>('win');
  const active = strategies[activeStrategy];

  return (
    <section className="home-page mx-auto max-w-5xl pb-6">
      <div className="home-page-hero -mx-4 -mt-6 bg-primary px-4 py-7 text-white sm:-mx-6 sm:-mt-8 sm:px-8">
        <p className="text-2xl font-bold sm:text-3xl">Home</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
          Welcome back, {firstName}. Stay connected, organized, and ready to serve.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 border-b border-border" role="tablist" aria-label="Home views">
        {(Object.keys(viewLabels) as HomeView[]).map((view) => (
          <button
            key={view}
            type="button"
            role="tab"
            aria-selected={activeView === view}
            onClick={() => setActiveView(view)}
            className={`min-h-12 border-b-2 px-2 text-xs font-semibold transition-colors sm:text-sm ${
              activeView === view ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-text'
            }`}
          >
            {viewLabels[view]}
          </button>
        ))}
      </div>

      <div className="home-page-content mt-5">
        {activeView === 'info' ? (
          <div className="space-y-8">
            <section className="home-info-section border-b border-border pb-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Your dashboard</p>
              <h2 className="mt-1 text-xl font-bold text-text">Welcome back, {firstName}</h2>
              <div className="mt-3 flex items-center gap-2 text-sm text-muted">
                {semesterLoading ? <span>Loading semester...</span> : activeSemesterName ? <span>Active semester: <span className="font-semibold text-text">{activeSemesterName}</span></span> : <span>We are so excited to see what God will do this semester!</span>}
              </div>
            </section>

            <section className="home-info-section grid gap-6 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Eye className="h-4 w-4" /> Vision statement</div>
                <h2 className="mt-3 text-2xl font-bold text-text">We want to see</h2>
                <blockquote className="mt-5 border-l-4 border-primary bg-primary-soft p-4 text-sm italic leading-7 text-text">“A community of Christ-centered multiplying disciples, who love and disciple one another, expanding from UNIMAS to family, church, work and beyond.”</blockquote>
              </div>
              <img src="/CLC fam.png" alt="Student Fellowship Community" className="h-56 w-full rounded-lg object-cover" />
            </section>

            <section className="home-info-section border-t border-border pt-8 grid gap-6 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Flag className="h-4 w-4" /> Mission mandate</div>
                <h2 className="mt-3 text-2xl font-bold text-text">We are committed to</h2>
                <blockquote className="mt-5 border-l-4 border-primary bg-primary-soft p-4 text-sm italic leading-7 text-text">“Build Christ-centered multiplying disciples through win build train and send, helping them to be someone who truly follow Jesus Christ, and also able to multiply disciples, in the power of Holy Spirit.”</blockquote>
              </div>
              <img src="/Mission Mandate.png" alt="Christ-Centered Multiplying Community" className="h-56 w-full rounded-lg object-cover" />
            </section>

            <section className="home-info-section border-t border-border pt-8">
              <div className="text-center"><div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><BookOpen className="h-4 w-4" /> Our strategies</div><h2 className="mt-3 text-2xl font-bold text-text">W B T S</h2><p className="mt-2 text-sm text-muted">See how we guide and empower every student.</p></div>
              <div className="mt-5 grid grid-cols-4 border-b border-border" role="tablist" aria-label="Home strategy stages">
                {(Object.keys(strategies) as StrategyKey[]).map((key) => <button key={key} type="button" role="tab" aria-selected={activeStrategy === key} onClick={() => setActiveStrategy(key)} className={`min-h-11 border-b-2 px-2 text-xs font-semibold transition-colors ${activeStrategy === key ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-text'}`}>{strategies[key].label}</button>)}
              </div>
              <div key={activeStrategy} className="home-strategy-panel mt-5 grid gap-5 sm:grid-cols-[10rem_1fr] sm:items-start">
                <img src={active.image} alt={`${active.label}: ${active.title}`} className="h-50 w-full rounded-lg object-cover sm:h-28" />
                <div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Stage {Object.keys(strategies).indexOf(activeStrategy) + 1} · {active.detail}</p><h3 className="mt-2 text-lg font-bold text-text"><strong>{active.label}:</strong> {active.title}</h3><blockquote className="mt-3 border-l-4 border-primary bg-primary-soft p-4 text-sm italic leading-7 text-text">“{active.text}”</blockquote></div>
              </div>
            </section>

            <section className="home-info-section border-t border-border pt-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Our posture</p>
              <h2 className="mt-3 text-2xl font-bold text-text">Prayer</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted">Prayer is not just our strategy, it is our posture. We believe only God can change people's heart, only God can cause people to grow, and all of these are for His glory. We are reminded to always be in a posture of prayer to pray for our campus.</p>
              <img src="/Prayer.JPG" alt="Prayer is our posture" className="mx-auto mt-5 h-56 w-full max-w-2xl rounded-lg object-cover" />
              <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs font-semibold text-primary"><span className="rounded border border-border px-3 py-2">Prayer walks</span><span className="rounded border border-border px-3 py-2">Outreach together</span><span className="rounded border border-border px-3 py-2">Campus fellowship</span></div>
            </section>

            {/* <section className="home-info-section border-t border-border pt-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Make room to serve</p>
                <h2 className="mt-3 text-2xl font-bold text-text">Upcoming outreach activities</h2>
              </div>
              <div className="mt-5 space-y-3">
                <article className="flex gap-3 border-b border-border py-3">
                  <b className="w-12 shrink-0 text-center text-xl text-primary"><small className="block text-xs">SAT</small>14</b>
                  <div><h3 className="font-bold text-text">DMPR <span className="ml-2 text-xs font-semibold text-primary">6 slots left</span></h3><p className="text-sm text-muted">08:30–11:30 · Packing &amp; distribution</p><small className="mt-1 flex items-center gap-1 text-muted"><MapPin className="h-3.5 w-3.5" /> Dream Centre</small></div>
                </article>
                <article className="flex gap-3 border-b border-border py-3">
                  <b className="w-12 shrink-0 text-center text-xl text-primary"><small className="block text-xs">SUN</small>15</b>
                  <div><h3 className="font-bold text-text">FOC Outreach <span className="ml-2 text-xs font-semibold text-primary">4 slots left</span></h3><p className="text-sm text-muted">14:00–17:00 · Digital literacy &amp; tutoring</p><small className="mt-1 flex items-center gap-1 text-muted"><MapPin className="h-3.5 w-3.5" /> UNIMAS Feng</small></div>
                </article>
                <article className="flex gap-3 py-3">
                  <b className="w-12 shrink-0 text-center text-xl text-primary"><small className="block text-xs">SAT</small>21</b>
                  <div><h3 className="font-bold text-text">Beach Trip 2026 <span className="ml-2 text-xs font-semibold text-primary">8 slots</span></h3><p className="text-sm text-muted">09:00–12:00 · Wellness visits &amp; singing</p><small className="mt-1 flex items-center gap-1 text-muted"><MapPin className="h-3.5 w-3.5" /> TBD</small></div>
                </article>
              </div>
            </section> */}
          </div>
        ) : (
          <section aria-label="Calendar">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-text">Calendar</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">Your upcoming activities and serving schedule will appear here.</p>
          </section>
        )}
      </div>
    </section>
  );
};
