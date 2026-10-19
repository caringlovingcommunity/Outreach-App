import type { ResponseStatus } from '../types';

/** Labels stored in the contact search index and shown in the UI. */
export const CONTACT_RESPONSE_LABELS: Record<ResponseStatus, string> = {
  pray_receive_christ: 'Prayed to receive Christ',
  already_christian: 'Already Christian',
  not_ready: 'Not ready',
  say_yes_follow_up: 'Said yes to follow-up',
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const CONTACT_DATE_BUCKETS = [
  'Upcoming',
  'Today',
  'Yesterday',
  'Last week',
  'Last month',
  'Last year',
  'Older',
  'Unknown date',
] as const;

export type ContactDateBucket = typeof CONTACT_DATE_BUCKETS[number];

interface ContactDateSource {
  contactDate?: string | null;
  createdAt?: any;
}

export const getContactDate = (contact: ContactDateSource): Date | null => {
  if (typeof contact.contactDate === 'string') {
    const [year, month, day] = contact.contactDate.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12);
    if (
      Number.isFinite(date.getTime()) &&
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }
  }

  const createdAt = contact.createdAt;
  const date =
    createdAt instanceof Date
      ? createdAt
      : typeof createdAt?.toDate === 'function'
        ? createdAt.toDate()
        : null;
  return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
};

export const getContactDateBucket = (
  date: Date | null,
  now = new Date(),
): ContactDateBucket => {
  if (!date) return 'Unknown date';
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const contactDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const daysAgo = Math.floor((today - contactDay) / DAY_MS);
  if (daysAgo < 0) return 'Upcoming';
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  if (daysAgo <= 7) return 'Last week';
  if (daysAgo <= 30) return 'Last month';
  if (daysAgo <= 365) return 'Last year';
  return 'Older';
};

/**
 * Longest single search term we index. Contact fields are capped by the
 * security rules well below this, so full names/phone numbers/statuses fit.
 */
const MAX_SEARCH_TERM_LENGTH = 120;

/** Safety cap on the denormalized array size per contact. */
const MAX_SEARCH_TERMS = 1000;

/** Normalizes a value or query the same way on write and read. */
export const normalizeContactSearchValue = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Adds prefixes for the whole value and for each word in it. Whole-value
 * prefixes keep multi-word queries working ("sarah mit", "last week"), while
 * word prefixes let "mit" find "Sarah Mitchell".
 */
const addSearchValue = (terms: Set<string>, raw: string | null | undefined) => {
  if (!raw) return;
  const normalized = normalizeContactSearchValue(raw);
  if (!normalized) return;

  const valueLimit = Math.min(normalized.length, MAX_SEARCH_TERM_LENGTH);
  for (let index = 2; index <= valueLimit; index += 1) {
    terms.add(normalized.slice(0, index));
  }

  normalized.split(/[^\p{L}\p{N}]+/u).forEach((word) => {
    if (word.length < 2) return;
    const wordLimit = Math.min(word.length, MAX_SEARCH_TERM_LENGTH);
    for (let index = 2; index <= wordLimit; index += 1) {
      terms.add(word.slice(0, index));
    }
  });
};

export interface ContactSearchSource {
  name: string;
  phoneNumber?: string | null;
  createdByName?: string | null;
  responseStatuses?: ResponseStatus[] | null;
  gospelStatus?: string | null;
  contactDate?: string | null;
  createdAt?: any;
}

/**
 * Builds the denormalized `searchTerms` array on a contact. The array is
 * queried with `array-contains`, so the UI can still search by name, phone,
 * creator, gospel status, responses, dates, and date bucket.
 */
export const buildContactSearchTerms = (contact: ContactSearchSource): string[] => {
  const terms = new Set<string>();

  addSearchValue(terms, contact.name);
  addSearchValue(terms, contact.phoneNumber);
  if (contact.phoneNumber) {
    addSearchValue(terms, contact.phoneNumber.replace(/\D/g, ''));
  }
  addSearchValue(terms, contact.createdByName);

  (contact.responseStatuses ?? []).forEach((status) => {
    addSearchValue(terms, CONTACT_RESPONSE_LABELS[status]);
  });

  addSearchValue(terms, contact.gospelStatus?.replaceAll('_', ' '));
  addSearchValue(terms, contact.contactDate);

  const date = getContactDate(contact);
  if (date) {
    addSearchValue(terms, date.toLocaleDateString('en-GB'));
    // Bucket labels are relative to the write/backfill time. Contact dates
    // themselves stay searchable regardless, and saving a contact refreshes
    // its bucket label.
    addSearchValue(terms, getContactDateBucket(date));
  }

  return [...terms].slice(0, MAX_SEARCH_TERMS);
};
