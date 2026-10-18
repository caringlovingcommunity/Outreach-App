import React, { useMemo, useState } from 'react';
import { Plus, Search, UserRound, X } from 'lucide-react';
import type { TreeCandidate } from '../../hooks/useDiscipleshipTree';

interface UnplacedPanelProps {
  candidates: TreeCandidate[];
  placementTargetName: string | null;
  onAdd: (candidate: TreeCandidate) => void;
  onClearTarget: () => void;
  busy: boolean;
}

export const UnplacedPanel: React.FC<UnplacedPanelProps> = ({
  candidates,
  placementTargetName,
  onAdd,
  onClearTarget,
  busy,
}) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const sorted = [...candidates].sort((a, b) => a.displayName.localeCompare(b.displayName));
    if (!term) return sorted;
    return sorted.filter((candidate) => candidate.displayName.toLowerCase().includes(term)
      || candidate.subtitle.toLowerCase().includes(term));
  }, [candidates, search]);

  return (
    <aside className="app-panel flex flex-col gap-3 p-4">
      <div>
        <h2 className="text-sm font-bold text-text">Not yet in this tree</h2>
        <p className="mt-1 text-xs text-muted">
          {placementTargetName
            ? <>Tap a person to place them under <span className="font-semibold text-primary">{placementTargetName}</span>.</>
            : 'Choose “Add” on a node, or place someone at the top with the button below.'}
        </p>
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
          placeholder="Search members and contacts"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      {filtered.length === 0 ? (
        <p className="app-empty-state min-h-32 text-sm text-muted">
          {candidates.length === 0 ? 'Everyone available has been placed in this tree.' : 'No one matches that search.'}
        </p>
      ) : (
        <ul className="-mx-1 max-h-[26rem] space-y-1 overflow-y-auto px-1">
          {filtered.map((candidate) => (
            <li key={`${candidate.nodeType}:${candidate.refId}`}>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-app-md border border-transparent px-2 py-2 text-left transition-colors hover:border-border hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => onAdd(candidate)}
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
        </ul>
      )}
    </aside>
  );
};
