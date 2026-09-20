import React, { useEffect, useMemo, useState } from 'react';
import { MoreVertical, Search, Users } from 'lucide-react';
import { getTeamFriends } from '../services/friendsService';
import type { PublicUserProfile } from '../types/user';
import { MySheepsPage } from './MySheepsPage';

type FriendsView = 'my_friends' | 'team_friends' | 'dashboard';

interface FriendsPageProps {
  currentUserId: string;
}

const viewLabels: Record<FriendsView, string> = {
  my_friends: 'My Sheeps 🐑',
  team_friends: 'Team Friends',
  dashboard: 'Dashboard',
};

export const FriendsPage: React.FC<FriendsPageProps> = ({ currentUserId }) => {
  const [activeView, setActiveView] = useState<FriendsView>('team_friends');
  const [people, setPeople] = useState<PublicUserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<PublicUserProfile | null>(null);

  useEffect(() => {
    let isMounted = true;

    getTeamFriends()
      .then((profiles) => {
        if (isMounted) setPeople(profiles.filter((profile) => profile.uid !== currentUserId));
      })
      .catch(() => {
        if (isMounted) setError('Unable to load the team right now.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUserId]);

  const filteredPeople = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return people;
    return people.filter((person) =>
      [person.displayName, person.course, person.faculty]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedSearch)),
    );
  }, [people, searchTerm]);

  const groupedPeople = useMemo(() => {
    return filteredPeople.reduce<Record<string, PublicUserProfile[]>>((groups, person) => {
      const group = person.faculty || 'Outreach Team';
      groups[group] = [...(groups[group] || []), person];
      return groups;
    }, {});
  }, [filteredPeople]);

  return (
    <section className="mx-auto max-w-5xl pb-6">
      <div className="-mx-4 -mt-6 bg-primary px-4 py-7 text-white sm:-mx-6 sm:-mt-8 sm:px-8">
        <p className="text-2xl font-bold sm:text-3xl">Friends</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
          Step out in faith to make new friends, and remain organized and intentional in your connections.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 border-b border-border" role="tablist" aria-label="Friends views">
        {(Object.keys(viewLabels) as FriendsView[]).map((view) => (
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

      {activeView === 'my_friends' ? (
        <MySheepsPage />
      ) : activeView === 'team_friends' ? (
        <>
          <label className="relative mt-5 block">
            <span className="sr-only">Search friends</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search friends"
              className="app-input pl-10"
            />
          </label>

          {loading ? (
            <div className="app-loading-state mt-5 min-h-48">
              <Users className="h-7 w-7 animate-pulse text-primary" />
              <p className="mt-3 text-sm text-muted">Loading friends...</p>
            </div>
          ) : error ? (
            <div className="app-alert-error mt-5">{error}</div>
          ) : Object.keys(groupedPeople).length === 0 ? (
            <div className="app-empty-state mt-5 min-h-48">
              <Users className="h-7 w-7 text-muted" />
              <p className="mt-3 text-sm text-muted">No friends match your search.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-7">
              {Object.entries(groupedPeople).map(([group, members]) => (
                <section key={group} aria-labelledby={`friends-group-${group}`}>
                  <h2 id={`friends-group-${group}`} className="text-lg font-bold text-text">{group}</h2>
                  <div className="mt-2 divide-y divide-border border-y border-border">
                    {members.map((person) => (
                      <article key={person.uid} className="flex items-center gap-3 py-3">
                        {person.photoURL ? (
                          <img src={person.photoURL} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft font-bold text-primary">
                            {person.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-text">{person.displayName}</p>
                          <p className="truncate text-sm text-muted">{person.course || 'CLC Outreach member'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedPerson(person)}
                          aria-label={`View ${person.displayName} profile`}
                          className="app-icon-button size-9 shrink-0"
                          title="View profile"
                        >
                          <MoreVertical className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="app-empty-state mt-8 min-h-56">
          <Users className="h-8 w-8 text-muted" />
          <h2 className="mt-3 font-semibold text-text">{viewLabels[activeView]}</h2>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Key in the contacts that you have approached as we want to be a good steward to follow up those potential disciples God entrusted to us.
          </p>
        </div>
      )}

      {selectedPerson && (
        <div className="app-modal-backdrop" role="presentation" onClick={() => setSelectedPerson(null)}>
          <section
            className="app-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="friend-profile-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              {selectedPerson.photoURL ? (
                <img src={selectedPerson.photoURL} alt="" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-xl font-bold text-primary">
                  {selectedPerson.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h2 id="friend-profile-title" className="text-lg font-bold text-text">{selectedPerson.displayName}</h2>
                <p className="text-sm text-muted">{selectedPerson.course || 'CLC Outreach member'}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 text-sm text-text">
              {selectedPerson.faculty && <p><span className="font-semibold">Faculty:</span> {selectedPerson.faculty}</p>}
              {selectedPerson.yearOfStudy && <p><span className="font-semibold">Year:</span> {selectedPerson.yearOfStudy}</p>}
            </div>
            <button type="button" onClick={() => setSelectedPerson(null)} className="app-button-secondary mt-6 w-full">Close</button>
          </section>
        </div>
      )}
    </section>
  );
};
