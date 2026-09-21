import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, Link2, MoreVertical, Search, Users } from 'lucide-react';
import { getDisciplerForStudent } from '../services/contactsService';
import { getTeamFriendsWithContacts } from '../services/friendsService';
import type { LinkedTeamFriend } from '../services/friendsService';
import type { Contact } from '../types';
import { useContacts } from '../hooks/useContacts';
import { getFriendsDashboardMetrics, getNextJourneyStep } from '../utils/friendsDashboard';
import { MySheepsPage } from './MySheepsPage';

type FriendsView = 'my_friends' | 'team_friends' | 'dashboard';
type TeamFriendFilter = 'faculty' | 'year' | 'course' | 'college' | 'invitedBy' | 'linkedBy';
type DashboardFilter = 'all' | 'follow_up' | 'linked' | 'gospel_status' | 'response_status' | 'journey_in_progress' | 'journey_completed' | 'recent';

interface FriendsPageProps {
  currentUserId: string;
  isStudent?: boolean;
}

const viewLabels: Record<FriendsView, string> = {
  my_friends: 'My Sheeps 🐑',
  team_friends: 'Team Friends',
  dashboard: 'Dashboard',
};

const formatLabel = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
const shortenLabel = (value: string, maxLength = 32) => value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
const formatDateTime = (value: any) => {
  const date = typeof value?.toDate === 'function' ? value.toDate() : value instanceof Date ? value : value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : 'Unknown';
};

const statusLabels = {
  not_started: 'Not started',
  gospel_conversation: 'Gospel conversation',
  gospel_presentation: 'Gospel presentation',
  pray_receive_christ: 'Prayed to receive Christ',
  already_christian: 'Already Christian',
  not_ready: 'Not ready',
  say_yes_follow_up: 'Said yes to follow-up',
};

const OutreachContactAvatar: React.FC<{ gender: Contact['gender'] }> = ({ gender }) => (
  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-primary-soft">
    <img
      src={gender === 'female' ? '/Avatar%20-%20Female%20_1.png' : '/Avatar%20-%20Male%20_1.png'}
      alt={`${gender} avatar`}
      className="h-full w-full object-cover"
    />
  </div>
);

const OutreachContactDetails: React.FC<{ contact: Contact }> = ({ contact }) => {
  const nextJourneyStep = getNextJourneyStep(contact);

  return (
    <article className="rounded-app-md border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <OutreachContactAvatar gender={contact.gender} />
          <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Outreach contact</p>
            <h3 className="mt-1 truncate font-semibold text-text">{contact.name}</h3>
          </div>
        </div>
        <span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-semibold text-primary">{formatLabel(contact.gospelStatus)}</span>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-text sm:grid-cols-2">
        <p><span className="font-semibold">Phone:</span> {contact.phoneNumber || 'Not provided'}</p>
        <p><span className="font-semibold">Gender:</span> {formatLabel(contact.gender)}</p>
        <p><span className="font-semibold">Responses:</span> {contact.responseStatuses.map(formatLabel).join(', ') || 'None recorded'}</p>
        <p><span className="font-semibold">Next follow-up:</span> {nextJourneyStep ? formatLabel(nextJourneyStep) : 'Journey complete'}</p>
      </div>

      {contact.remarks && (
        <div className="mt-4 border-t border-border pt-3 text-sm text-text">
          <p className="font-semibold">Remarks</p>
          <p className="mt-1 text-muted">{contact.remarks}</p>
        </div>
      )}

      <div className="mt-4 border-t border-border pt-3 text-xs text-muted">
        <p>Added: {contact.createdAt?.toDate?.()?.toLocaleString?.() || 'Unknown'}</p>
        <p>Updated: {contact.updatedAt?.toDate?.()?.toLocaleString?.() || 'Unknown'}</p>
      </div>
    </article>
  );
};

export const FriendsPage: React.FC<FriendsPageProps> = ({ currentUserId, isStudent = false }) => {
  const { myContacts, communityContacts, loading: contactsLoading, error: contactsError } = useContacts();
  const [activeView, setActiveView] = useState<FriendsView>('team_friends');
  const [people, setPeople] = useState<LinkedTeamFriend[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<TeamFriendFilter | ''>('');
  const [filterValue, setFilterValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<LinkedTeamFriend | null>(null);
  const [dashboardFilter, setDashboardFilter] = useState<DashboardFilter | null>(null);
  const [dashboardFilterValue, setDashboardFilterValue] = useState<string | null>(null);
  const [discipler, setDiscipler] = useState<{ displayName: string; photoURL: string } | null>(null);
  const [disciplerLoading, setDisciplerLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getTeamFriendsWithContacts(!isStudent)
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
  }, [currentUserId, isStudent]);

  useEffect(() => {
    let isMounted = true;

    getDisciplerForStudent(currentUserId)
      .then((profile) => {
        if (isMounted) setDiscipler(profile);
      })
      .finally(() => {
        if (isMounted) setDisciplerLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUserId, isStudent]);

  const filteredPeople = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return people.filter((person) => !person.isFiltered &&
      (!normalizedSearch || [person.displayName, person.course, person.faculty, person.college, person.invitedByName, ...person.linkedContacts.map((contact) => contact.name)]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedSearch)))
      && (!filterBy || !filterValue || (
        filterBy === 'faculty' ? person.faculty === filterValue
          : filterBy === 'year' ? String(person.yearOfStudy || '') === filterValue
            : filterBy === 'course' ? person.course === filterValue
              : filterBy === 'college' ? person.college === filterValue
                : filterBy === 'invitedBy' ? person.invitedByName === filterValue
                  : person.linkedByNames.includes(filterValue)
      )),
    );
  }, [people, searchTerm, filterBy, filterValue]);

  const filterOptions = useMemo(() => {
    const values = people.filter((person) => !person.isFiltered).flatMap((person) => {
      if (filterBy === 'faculty') return person.faculty ? [person.faculty] : [];
      if (filterBy === 'year') return person.yearOfStudy ? [String(person.yearOfStudy)] : [];
      if (filterBy === 'course') return person.course ? [person.course] : [];
      if (filterBy === 'college') return person.college ? [person.college] : [];
      if (filterBy === 'invitedBy') return person.invitedByName ? [person.invitedByName] : [];
      return person.linkedByNames;
    });
    return [...new Set(values)].sort();
  }, [people, filterBy]);

  const groupedPeople = useMemo(() => {
    const groups = filteredPeople.reduce<Record<string, LinkedTeamFriend[]>>((grouped, person) => {
      const group = filterBy === 'year'
        ? person.yearOfStudy ? `Year ${person.yearOfStudy}` : 'Unknown Year'
        : filterBy === 'faculty'
          ? person.faculty || 'Unknown Faculty'
          : filterBy === 'course'
            ? person.course || 'Unknown Course'
            : filterBy === 'college'
              ? person.college || 'Unknown College'
              : filterBy === 'invitedBy'
                ? person.invitedByName || 'Unknown Inviter'
                : filterBy === 'linkedBy'
                  ? person.linkedByNames[0] || 'Unknown Linker'
                  : 'Outreach Team';
      grouped[group] = [...(grouped[group] || []), person];
      return grouped;
    }, {});

    Object.values(groups).forEach((members) => {
      members.sort((first, second) => first.displayName.localeCompare(second.displayName));
    });

    return Object.fromEntries(Object.entries(groups).sort(([first], [second]) => {
      if (filterBy === 'year') {
        const firstYear = Number(first.match(/\d+/)?.[0] || 999);
        const secondYear = Number(second.match(/\d+/)?.[0] || 999);
        return firstYear - secondYear;
      }
      return first.localeCompare(second);
    }));
  }, [filteredPeople, filterBy]);

  const dashboardContactsForUser = useMemo(
    () => isStudent
      ? myContacts
      : communityContacts.filter((contact) => contact.linkedByUid === currentUserId),
    [communityContacts, currentUserId, isStudent, myContacts],
  );
  const dashboardMetrics = useMemo(() => getFriendsDashboardMetrics(dashboardContactsForUser), [dashboardContactsForUser]);

  const dashboardContacts = useMemo(() => {
    if (!dashboardFilter || dashboardFilter === 'all') return dashboardContactsForUser;
    if (dashboardFilter === 'follow_up' || dashboardFilter === 'journey_in_progress') {
      return dashboardContactsForUser.filter((contact) => contact.responseStatuses.includes('say_yes_follow_up') && getNextJourneyStep(contact));
    }
    if (dashboardFilter === 'linked') return dashboardContactsForUser.filter((contact) => Boolean(contact.linkedUserId));
    if (dashboardFilter === 'gospel_status') return dashboardContactsForUser.filter((contact) => contact.gospelStatus === dashboardFilterValue);
    if (dashboardFilter === 'response_status') return dashboardContactsForUser.filter((contact) => contact.responseStatuses.includes(dashboardFilterValue as Contact['responseStatuses'][number]));
    if (dashboardFilter === 'journey_completed') return dashboardContactsForUser.filter((contact) => contact.responseStatuses.includes('say_yes_follow_up') && Object.values(contact.followUpProgress).every(Boolean));
    return dashboardMetrics.recentlyUpdated;
  }, [dashboardContactsForUser, dashboardFilter, dashboardFilterValue, dashboardMetrics.recentlyUpdated]);

  const openDashboardResults = (filter: DashboardFilter, value?: string) => {
    setDashboardFilter(filter);
    setDashboardFilterValue(value || null);
  };

  const dashboardFilterLabel = dashboardFilter === 'all' ? 'All outreach contacts'
    : dashboardFilter === 'follow_up' ? 'Contacts needing follow-up'
      : dashboardFilter === 'linked' ? 'CLC friends'
        : dashboardFilter === 'recent' ? 'Recently updated contacts'
          : dashboardFilter === 'journey_in_progress' ? 'Journey of Faith in progress'
            : dashboardFilter === 'journey_completed' ? 'Journey of Faith completed'
              : dashboardFilterValue ? statusLabels[dashboardFilterValue as keyof typeof statusLabels] : 'Filtered contacts';

  const dashboardPersonForContact = (contact: Contact) => people.find((person) => person.uid === contact.linkedUserId);

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

          <section className="mt-5 border-b border-border pb-4">
            <h2 className="text-lg font-bold text-text">Your Discipler</h2>
            {disciplerLoading ? (
              <p className="mt-2 text-sm text-muted">Loading discipler...</p>
            ) : discipler ? (
              <div className="mt-3 flex items-center gap-3">
                {discipler.photoURL ? (
                  <img src={discipler.photoURL} alt="" className="h-11 w-11 rounded-full object-cover" />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                    {discipler.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <p className="font-semibold text-text">{discipler.displayName}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">No discipler has been assigned yet.</p>
            )}
          </section>
          {!isStudent && <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label>
              <span className="sr-only">Filter friends by</span>
              <select
                value={filterBy}
                onChange={(event) => {
                  setFilterBy(event.target.value as TeamFriendFilter | '');
                  setFilterValue('');
                }}
                className="app-input"
              >
                <option value="">Filter by...</option>
                <option value="faculty">Faculty</option>
                <option value="year">Year</option>
                <option value="course">Course</option>
                <option value="college">College</option>
                <option value="invitedBy">Invited By</option>
                <option value="linkedBy">Linked By</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Filter value</span>
              <select
                value={filterValue}
                onChange={(event) => setFilterValue(event.target.value)}
                disabled={!filterBy}
                className="app-input disabled:opacity-60"
              >
                <option value="">All values</option>
                {filterOptions.map((option) => <option key={option} value={option}>{filterBy === 'linkedBy' ? shortenLabel(option) : option}</option>)}
              </select>
            </label>
          </div>}

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
                          <p className="truncate font-semibold text-text">{person.displayName.replace(/\b\w/g, (character) => character.toUpperCase())}</p>
                          <p className="truncate text-sm text-muted">{person.course || 'CLC Outreach member'}</p>
                          {person.linkedContacts.length > 0 && <p className="truncate text-xs font-semibold text-primary">CLC Friends · {person.linkedContacts.map((contact) => contact.name).join(', ')}</p>}
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
      ) : contactsLoading ? (
        <div className="app-loading-state mt-8 min-h-56">
          <Users className="h-8 w-8 animate-pulse text-primary" />
          <p className="mt-3 text-sm text-muted">Loading dashboard...</p>
        </div>
      ) : contactsError ? (
        <div className="app-alert-error mt-8">{contactsError}</div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Outreach contacts', value: dashboardMetrics.totalContacts, icon: Users },
              { label: 'Need follow-up', value: dashboardMetrics.followUpNeeded, icon: Clock3 },
              { label: 'Disciples', value: dashboardMetrics.linkedContacts, icon: Link2 },
            ].map(({ label, value, icon: Icon }) => (
              <button type="button" key={label} onClick={() => openDashboardResults(label === 'Outreach contacts' ? 'all' : label === 'Need follow-up' ? 'follow_up' : 'linked')} className="app-panel flex items-center gap-3 p-4 text-left transition-colors hover:border-primary hover:bg-primary-soft">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted">{label}</p>
                  <p className="text-xl font-bold text-text">{value}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="app-panel p-5">
              <h2 className="font-bold text-text">Statistics</h2>
              <div className="mt-3 space-y-3">
                {(['not_started', 'gospel_conversation', 'gospel_presentation'] as const).map((status) => (
                  <button type="button" key={status} onClick={() => openDashboardResults('gospel_status', status)} className="flex w-full items-center justify-between gap-3 text-left text-sm hover:text-primary">
                    <span className="text-muted">{statusLabels[status]}</span>
                    <span className="font-semibold text-text">{dashboardMetrics.gospelStatusCounts[status]}</span>
                  </button>
                ))}
              </div>
            </section>
            <section className="app-panel p-5">
              <h2 className="font-bold text-text">Responses</h2>
              <div className="mt-3 space-y-3">
                {(['pray_receive_christ', 'already_christian', 'not_ready', 'say_yes_follow_up'] as const).map((status) => (
                  <button type="button" key={status} onClick={() => openDashboardResults('response_status', status)} className="flex w-full items-center justify-between gap-3 text-left text-sm hover:text-primary">
                    <span className="text-muted">{statusLabels[status]}</span>
                    <span className="font-semibold text-text">{dashboardMetrics.responseStatusCounts[status]}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* <section className="app-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-text">Journey of Faith</h2>
              <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <button type="button" onClick={() => openDashboardResults('journey_in_progress')} className="text-left text-muted hover:text-primary">In progress <span className="float-right font-semibold text-text">{dashboardMetrics.journeyOfFaith.inProgress}</span></button>
              <button type="button" onClick={() => openDashboardResults('journey_completed')} className="text-left text-muted hover:text-primary">Completed <span className="float-right font-semibold text-text">{dashboardMetrics.journeyOfFaith.completed}</span></button>
            </div>
          </section> */}

          {/* <section className="app-panel p-5">
            <h2 className="font-bold text-text">Recently updated</h2>
            {dashboardMetrics.recentlyUpdated.length > 0 ? (
              <div className="mt-3 divide-y divide-border">
                {dashboardMetrics.recentlyUpdated.map((contact) => (
                  <button type="button" key={contact.id} onClick={() => openDashboardResults('recent')} className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm hover:bg-primary-soft">
                    <span className="truncate font-semibold text-text">{contact.name}</span>
                    <span className="shrink-0 text-muted">{formatLabel(contact.gospelStatus)}</span>
                  </button>
                ))}
              </div>
            ) : <p className="mt-3 text-sm text-muted">Your updated contacts will appear here.</p>}
          </section> */}
        </div>
      )}

      {dashboardFilter && (
        <div className="app-modal-backdrop" role="presentation" onClick={() => setDashboardFilter(null)}>
          <section
            className="app-modal max-h-[85vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-results-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Dashboard details</p>
                <h2 id="dashboard-results-title" className="mt-1 text-lg font-bold text-text">{dashboardFilterLabel}</h2>
                <p className="mt-1 text-sm text-muted">{dashboardContacts.length} contact{dashboardContacts.length === 1 ? '' : 's'}</p>
              </div>
              <button type="button" onClick={() => setDashboardFilter(null)} className="app-icon-button size-9" aria-label="Close dashboard details">&times;</button>
            </div>

            {dashboardContacts.length > 0 ? (
              <div className="mt-5 space-y-4">
                {dashboardContacts.map((contact) => {
                  const person = dashboardPersonForContact(contact);
                  return person ? (
                    <article key={contact.id} className="rounded-app-md border border-primary-muted bg-primary-soft p-4 shadow-app-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          {person.photoURL ? (
                            <img src={person.photoURL} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white font-bold text-primary">{person.displayName.charAt(0).toUpperCase()}</div>
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs font-semibold uppercase tracking-wider text-primary">CLC Friends</p>
                            </div>
                            <h3 className="truncate font-semibold text-text">{person.displayName.replace(/\b\w/g, (character) => character.toUpperCase())}</h3>                             
                            {person.isFiltered && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">Filtered Member</span>}
                            <p className="truncate text-sm text-muted">{person.course || 'CLC Outreach member'}</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-primary">{formatLabel(contact.gospelStatus)}</span>
                      </div>
                      <div className="mt-4 grid gap-3 text-sm text-text sm:grid-cols-2">
                        <p><span className="font-semibold">Phone:</span> {contact.phoneNumber || 'Not provided'}</p>
                        <p><span className="font-semibold">Gender:</span> {formatLabel(contact.gender)}</p>
                        <p><span className="font-semibold">Responses:</span> {contact.responseStatuses.map(formatLabel).join(', ') || 'None recorded'}</p>
                        <p><span className="font-semibold">Next follow-up:</span> {getNextJourneyStep(contact) ? formatLabel(getNextJourneyStep(contact)!) : 'Journey complete'}</p>
                      </div>
                      {contact.remarks && (
                        <div className="mt-4 border-t border-primary-muted pt-3 text-sm text-text">
                          <p className="font-semibold">Remarks</p>
                          <p className="mt-1 text-muted">{contact.remarks}</p>
                        </div>
                      )}
                        <div className="mt-4 border-t border-border pt-3 text-xs text-muted">
                          <p>Joined: {formatDateTime(person.createdAt)}</p>
                          <p>Linked: {formatDateTime(contact.linkedAt)}</p>
                        </div>
                    </article>
                  ) : (
                    <OutreachContactDetails key={contact.id} contact={contact} />
                  );
                })}
              </div>
            ) : (
              <p className="mt-6 text-center text-sm text-muted">No contacts match this metric.</p>
            )}
            <button type="button" onClick={() => setDashboardFilter(null)} className="app-button-secondary mt-6 w-full">Close</button>
          </section>
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
                {selectedPerson.isFiltered && <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">Filtered user</span>}
              </div>
            </div>
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 text-sm text-text sm:grid-cols-2">
                {selectedPerson.faculty && <p><span className="font-semibold">Faculty:</span> {selectedPerson.faculty}</p>}
                {selectedPerson.yearOfStudy && <p><span className="font-semibold">Year:</span> {selectedPerson.yearOfStudy}</p>}
              </div>
              {selectedPerson.linkedContacts.length > 0 ? selectedPerson.linkedContacts.map((contact) => (
                <OutreachContactDetails key={contact.id} contact={contact} />
              )) : <p className="text-sm text-muted">No outreach contacts linked.</p>}
            </div>
            <button type="button" onClick={() => setSelectedPerson(null)} className="app-button-secondary mt-6 w-full">Close</button>
          </section>
        </div>
      )}
    </section>
  );
};
