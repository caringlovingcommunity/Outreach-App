import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, UserRound, Loader2, X, Plus } from 'lucide-react';
import { searchPlaceableCandidates, type TreeCandidate } from '../../services/discipleshipService';
import type { QueryDocumentSnapshot } from 'firebase/firestore';

const deduped = (list: TreeCandidate[]): TreeCandidate[] => {
  const seen = new Set<string>();
  return list.filter((c) => {
    const key = `${c.nodeType}:${c.refId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

interface AddPersonModalProps {
  treeId: string;
  currentUserId: string;
  placementTargetName: string | null;
  /** Set of `nodeType:refId` keys for people already placed in the tree. */
  placedKeys: Set<string>;
  onAdd: (candidate: TreeCandidate) => void;
  onClose: () => void;
  onClearTarget: () => void;
  busy: boolean;
  isOpen: boolean;
}

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

type Tab = 'members' | 'contacts';

export const AddPersonModal: React.FC<AddPersonModalProps> = ({
  treeId,
  currentUserId,
  placementTargetName,
  placedKeys,
  onAdd,
  onClose,
  onClearTarget,
  busy,
  isOpen,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [members, setMembers] = useState<TreeCandidate[]>([]);
  const [contacts, setContacts] = useState<TreeCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [membersCursor, setMembersCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [contactsCursor, setContactsCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('members');
  const listRef = useRef<HTMLUListElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch results when debounced term changes
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await searchPlaceableCandidates(treeId, debouncedTerm, currentUserId, {
          limit: PAGE_SIZE,
        });
        if (!cancelled) {
          setMembers(data.members.filter((m) => !placedKeys.has(`user:${m.refId}`)));
          setContacts(data.contacts.filter((c) => !placedKeys.has(`contact:${c.refId}`)));
          setHasMore(data.hasMore);
          setMembersCursor(data.membersCursor);
          setContactsCursor(data.contactsCursor);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to search people. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [debouncedTerm, treeId, currentUserId, isOpen]);

  // Load more on scroll (intersection observer on sentinel)
  useEffect(() => {
    if (!hasMore || loading) return;

    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          loadMore();
        }
      },
      { rootMargin: '100px' }
    );
    observerRef.current.observe(sentinel);

    return () => observerRef.current?.disconnect();
  }, [hasMore, loading]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const data = await searchPlaceableCandidates(treeId, debouncedTerm, currentUserId, {
        limit: PAGE_SIZE,
        membersCursor,
        contactsCursor,
      });
      setMembers((prev) => [...prev, ...data.members.filter((m) => !placedKeys.has(`user:${m.refId}`))]);
      setContacts((prev) => [...prev, ...data.contacts.filter((c) => !placedKeys.has(`contact:${c.refId}`))]);
      setHasMore(data.hasMore);
      setMembersCursor(data.membersCursor);
      setContactsCursor(data.contactsCursor);
    } catch {
      setError('Failed to load more results.');
    } finally {
      setLoading(false);
    }
  }, [treeId, currentUserId, debouncedTerm, membersCursor, contactsCursor, loading, hasMore]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setDebouncedTerm('');
      setMembers([]);
      setContacts([]);
      setMembersCursor(null);
      setContactsCursor(null);
      setHasMore(false);
      setError(null);
      setActiveTab('members');
    }
  }, [isOpen]);

  const results = useMemo(
    () => deduped(activeTab === 'members' ? members : contacts),
    [activeTab, members, contacts],
  );

  if (!isOpen) return null;

  return (
    <div
      className="app-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="app-modal mx-auto mt-auto max-h-[85vh] w-full max-w-md space-y-4 overflow-y-auto sm:mt-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-person-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Plus className="h-5 w-5" />
            </span>
            <div>
              <h2 id="add-person-title" className="text-lg font-bold text-text">
                {placementTargetName ? `Add under ${placementTargetName}` : 'Add person to tree'}
              </h2>
              <p className="mt-1 text-sm text-muted">
                Search by name to find members or contacts.
              </p>
            </div>
          </div>
          <button type="button" className="app-icon-button" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {placementTargetName && (
          <div className="flex items-center justify-between gap-2 rounded-app-md border border-primary-muted bg-primary-soft px-3 py-2 text-xs font-semibold text-primary">
            <span className="truncate">Adding under {placementTargetName}</span>
            <button type="button" className="app-icon-button size-7" onClick={onClearTarget} aria-label="Cancel placement target">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <label className="relative block">
          <span className="sr-only">Search people</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <input
            className="app-input pl-9"
            placeholder="Search people…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={busy}
            autoComplete="off"
          />
        </label>

        {/* Tab switcher */}
        <div className="flex rounded-app-md bg-surface-muted p-1" role="tablist" aria-label="Candidate type">
          {(['members', 'contacts'] as Tab[]).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              className={`flex-1 rounded-app-sm px-3 py-2 text-xs font-semibold transition-colors ${
                activeTab === tab
                  ? 'bg-surface text-primary shadow-app-sm'
                  : 'text-muted hover:text-text'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'members' ? 'Members' : 'Contacts'}
            </button>
          ))}
        </div>

        {loading && results.length === 0 && (
          <div className="flex min-h-32 items-center justify-center text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {error && (
          <p className="app-alert-error" role="alert">{error}</p>
        )}

        {results.length === 0 && !loading && debouncedTerm && (
          <p className="app-empty-state min-h-32 text-sm text-muted">
            No {activeTab} match "{debouncedTerm}".
          </p>
        )}

        {results.length === 0 && !loading && !debouncedTerm && (
          <p className="app-empty-state min-h-32 text-sm text-muted">
            Type a name to search for people to add.
          </p>
        )}

        {results.length > 0 && (
          <ul
            ref={listRef}
            className="-mx-1 max-h-[50vh] space-y-1 overflow-y-auto px-1"
            role="listbox"
            aria-label="Search results"
          >
            {results.map((candidate) => (
              <li key={`${activeTab}:${candidate.nodeType}:${candidate.refId}`} role="option">
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-app-md border border-transparent px-2 py-2 text-left transition-colors hover:border-border hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => {
                    onAdd(candidate);
                    onClose();
                  }}
                  disabled={busy}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-xs font-bold text-primary">
                    {candidate.photoUrl
                      ? <img src={candidate.photoUrl} alt="" className="h-full w-full object-cover" />
                      : candidate.nodeType === 'user' ? <UserRound className="h-4 w-4" /> : candidate.displayName.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-text">{candidate.displayName}</span>
                    <span className="block truncate text-xs text-muted">{candidate.subtitle}</span>
                  </span>
                  <Plus className="h-4 w-4 shrink-0 text-primary" />
                </button>
              </li>
            ))}

            {/* Load more sentinel */}
            <div ref={loadMoreRef} className="h-8 flex items-center justify-center">
              {loading && hasMore && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
              {hasMore && !loading && <span className="text-xs text-muted">Scroll for more…</span>}
            </div>
          </ul>
        )}

        <div className="flex justify-end pt-2 border-t border-border">
          <button type="button" className="app-button-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
