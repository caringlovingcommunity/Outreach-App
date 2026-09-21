import { JOURNEY_OF_FAITH_STEPS } from '../types';
import type { Contact, GospelStatus, JourneyOfFaithStep, ResponseStatus } from '../types';

export interface FriendsDashboardMetrics {
  totalContacts: number;
  gospelStatusCounts: Record<GospelStatus, number>;
  responseStatusCounts: Record<ResponseStatus, number>;
  followUpNeeded: number;
  journeyOfFaith: {
    completed: number;
    inProgress: number;
  };
  linkedContacts: number;
  recentlyUpdated: Contact[];
}

const gospelStatuses: GospelStatus[] = ['not_started', 'gospel_conversation', 'gospel_presentation'];
const responseStatuses: ResponseStatus[] = ['pray_receive_christ', 'already_christian', 'not_ready', 'say_yes_follow_up'];
export const getNextJourneyStep = (contact: Contact): JourneyOfFaithStep | null =>
  JOURNEY_OF_FAITH_STEPS.find((step) => !contact.followUpProgress?.[step]) || null;

const toMillis = (value: any): number => {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return 0;
};

export const getFriendsDashboardMetrics = (contacts: Contact[]): FriendsDashboardMetrics => {
  const gospelStatusCounts = Object.fromEntries(gospelStatuses.map((status) => [status, 0])) as Record<GospelStatus, number>;
  const responseStatusCounts = Object.fromEntries(responseStatuses.map((status) => [status, 0])) as Record<ResponseStatus, number>;
  let followUpNeeded = 0;
  let completed = 0;
  let inProgress = 0;

  contacts.forEach((contact) => {
    gospelStatusCounts[contact.gospelStatus] += 1;
    contact.responseStatuses.forEach((status) => { responseStatusCounts[status] += 1; });

    if (contact.responseStatuses.includes('say_yes_follow_up')) {
      const nextStep = getNextJourneyStep(contact);
      if (!nextStep) completed += 1;
      else {
        inProgress += 1;
        followUpNeeded += 1;
      }
    }
  });

  return {
    totalContacts: contacts.length,
    gospelStatusCounts,
    responseStatusCounts,
    followUpNeeded,
    journeyOfFaith: { completed, inProgress },
    linkedContacts: contacts.filter((contact) => Boolean(contact.linkedByUid)).length,
    recentlyUpdated: [...contacts]
      .sort((first, second) => toMillis(second.updatedAt) - toMillis(first.updatedAt))
      .slice(0, 5),
  };
};