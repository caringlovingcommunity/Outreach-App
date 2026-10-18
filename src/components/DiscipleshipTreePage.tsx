import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, LayoutGrid, ListTree, Loader2, Network, Plus, Trash2, X } from 'lucide-react';
import { addNode, createTree, deleteTree, moveNode, removeNodeWithChildren } from '../services/discipleshipService';
import { useDiscipleshipTree, type TreeOverviewStats, type TreeCandidate } from '../hooks/useDiscipleshipTree';
import { DiscipleshipTreeView } from './discipleship/DiscipleshipTreeView';
import { DiscipleshipTreeChart } from './discipleship/DiscipleshipTreeChart';
import { DiscipleshipTreeOverview } from './discipleship/DiscipleshipTreeOverview';
import type { DiscipleshipTreeViewProps } from './discipleship/treeInteractions';
import { UnplacedPanel } from './discipleship/UnplacedPanel';
import { RemoveNodeDialog } from './discipleship/RemoveNodeDialog';
import { NodeProfileDrawer } from './discipleship/NodeProfileDrawer';
import type { DiscipleshipNode, DiscipleshipTree } from '../types/discipleship';
import type { UserProfile } from '../types';

interface DiscipleshipTreePageProps {
  user: UserProfile;
}

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const RootsPreview: React.FC<{ stats?: TreeOverviewStats; onOpen: (nodeId: string) => void }> = ({ stats, onOpen }) => {
  if (!stats) return null;
  const roots = stats.rootNodes.slice(0, 3);
  const remaining = stats.rootCount - roots.length;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
      {roots.map((root) => (
        <button
          key={root.id}
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-1 text-left transition-colors hover:border-primary hover:text-primary"
          onClick={() => onOpen(root.id)}
        >
          <span className="truncate max-w-[160px]">{root.displayName}</span>
          {root.nodeType !== 'user' && (
            <span className="shrink-0 rounded border border-primary-muted bg-primary-soft px-1 py-0.5 text-[9px] uppercase tracking-wide text-primary">
              Contact
            </span>
          )}
        </button>
      ))}
      {remaining > 0 && (
        <span className="rounded-full bg-primary-soft px-2 py-1 text-[11px] font-semibold text-primary">+{remaining} more</span>
      )}
      {stats.rootCount === 0 && stats.total > 0 && (
        <span className="text-[11px] text-subtle">All nodes are attached — no roots</span>
      )}
      {stats.total === 0 && (
        <span className="text-[11px] text-subtle">No one placed yet</span>
      )}
    </div>
  );
};

export const DiscipleshipTreePage: React.FC<DiscipleshipTreePageProps> = ({ user }) => {
  const {
    trees,
    overviewByTree,
    selectedTree,
    selectedTreeId,
    setSelectedTreeId,
    nodes,
    nodeById,
    forest,
    forestByTree,
    candidates,
    duplicateTreeCounts,
    treesLoading,
    nodesLoading,
    error,
    setError,
    nodesLoaded,
  } = useDiscipleshipTree(user.uid);

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [mapCollapsedIds, setMapCollapsedIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'chart' | 'list'>('chart');
  const [overviewView, setOverviewView] = useState<'map' | 'cards'>('map');
  const [movingNodeId, setMovingNodeId] = useState<string | null>(null);
  const [placementTargetId, setPlacementTargetId] = useState<string | null>(null);
  const [removingNode, setRemovingNode] = useState<DiscipleshipNode | null>(null);
  const [profileNode, setProfileNode] = useState<DiscipleshipNode | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [focusTimer, setFocusTimer] = useState<number | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newTreeName, setNewTreeName] = useState('');
  const [newTreeDescription, setNewTreeDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const movingNode = useMemo(
    () => (movingNodeId ? nodeById.get(movingNodeId) ?? null : null),
    [movingNodeId, nodeById],
  );

  const expandedIds = useMemo(
    () => new Set(nodes.filter((node) => !collapsedIds.has(node.id)).map((node) => node.id)),
    [nodes, collapsedIds],
  );

  const resetInteractionState = () => {
    setCollapsedIds(new Set());
    setMovingNodeId(null);
    setPlacementTargetId(null);
    setFocusNodeId(null);
    if (focusTimer !== null) {
      window.clearTimeout(focusTimer);
      setFocusTimer(null);
    }
    setActionError(null);
  };

  const openTree = (treeId: string, focusNodeIdOverride?: string) => {
    // Resetting always expands every node, so a focus target is never hidden.
    resetInteractionState();
    setSelectedTreeId(treeId);
    if (!focusNodeIdOverride) return;
    setFocusNodeId(focusNodeIdOverride);
    setFocusTimer(window.setTimeout(() => setFocusNodeId(null), 2500));
  };

  // Scroll the focused node into view once it has rendered. Re-running on view
  // changes covers switching between chart and list, which remounts the nodes.
  useEffect(() => {
    if (!focusNodeId) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`discipleship-node-${focusNodeId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusNodeId, view]);

  const closeTree = () => {
    resetInteractionState();
    setSelectedTreeId(null);
  };

  const toggleExpanded = (nodeId: string) => {
    setCollapsedIds((previous) => {
      const next = new Set(previous);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
    setFocusNodeId(null);
    if (focusTimer !== null) {
      window.clearTimeout(focusTimer);
      setFocusTimer(null);
    }
  };

  /** Independent from the detail view's folds so the two never fight. */
  const toggleMapCollapsed = (nodeId: string) => {
    setMapCollapsedIds((previous) => {
      const next = new Set(previous);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const canDropOn = (target: DiscipleshipNode) => {
    if (!movingNode) return false;
    if (target.id === movingNode.id) return false;
    return !movingNode.path.every((id, index) => target.path[index] === id);
  };

  const runAction = async (action: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      return true;
    } catch (actionFailure) {
      setActionError(errorMessage(actionFailure, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleCreateTree = async () => {
    setCreating(true);
    setActionError(null);
    try {
      const treeId = await createTree(
        { name: newTreeName, description: newTreeDescription },
        { uid: user.uid, displayName: user.displayName },
      );
      setShowCreate(false);
      setNewTreeName('');
      setNewTreeDescription('');
      openTree(treeId);
    } catch (creationError) {
      setActionError(errorMessage(creationError, 'Unable to create this tree.'));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTree = async (tree: DiscipleshipTree) => {
    const confirmed = window.confirm(
      `Delete "${tree.name}" and all of its placement data?\n\nMember and contact records are not deleted — only this tree layout.`,
    );
    if (!confirmed) return;
    await runAction(() => deleteTree(tree.id), 'Unable to delete this tree.');
  };

  const handleAddCandidate = async (candidate: TreeCandidate) => {
    if (!selectedTreeId) return;
    await runAction(
      () => addNode(
        {
          treeId: selectedTreeId,
          nodeType: candidate.nodeType,
          refId: candidate.refId,
          displayName: candidate.displayName,
          photoUrl: candidate.photoUrl,
          gospelStatus: candidate.gospelStatus,
          membershipStatus: candidate.membershipStatus,
          parentId: placementTargetId,
        },
        { uid: user.uid, displayName: user.displayName },
      ),
      'Unable to add this person to the tree.',
    );
  };

  const handleSelectParent = async (parentId: string | null) => {
    if (!selectedTreeId || !movingNode) return;
    const moved = await runAction(
      () => moveNode(selectedTreeId, movingNode.id, parentId),
      'Unable to move this node.',
    );
    if (moved) setMovingNodeId(null);
  };

  const handleRemove = async () => {
    if (!selectedTreeId || !removingNode) return;
    const removed = await runAction(
      () => removeNodeWithChildren(selectedTreeId, removingNode.id),
      'Unable to remove this node.',
    );
    if (removed) setRemovingNode(null);
  };

  const placementTargetName = placementTargetId ? nodeById.get(placementTargetId)?.displayName ?? null : null;

  const treeViewProps: DiscipleshipTreeViewProps = {
    forest,
    expandedIds,
    onToggleExpanded: toggleExpanded,
    mode: movingNode ? 'move' : 'browse',
    movingNode,
    canDropOn,
    onSelectParent: (parentId) => void handleSelectParent(parentId),
    onStartMove: (node) => {
      setPlacementTargetId(null);
      setFocusNodeId(null);
      setMovingNodeId(node.id);
    },
    onAddChild: (node) => {
      setMovingNodeId(null);
      setFocusNodeId(null);
      setPlacementTargetId(node.id);
    },
    onRemove: (node) => setRemovingNode(node),
    onOpenProfile: (node) => setProfileNode(node),
    placementTargetId,
    focusNodeId,
  };

  // --- Tree list (overview) ---
  if (!selectedTreeId) {
    return (
      <section className="mx-auto max-w-5xl space-y-6 pb-6">
        <div className="home-page-hero -mx-4 -mt-6 bg-primary px-4 py-7 text-white sm:-mx-6 sm:-mt-8 sm:px-8">
          <p className="text-2xl font-bold sm:text-3xl">Discipleship Trees</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
            Map who is discipling whom. Place members and contacts into a tree, then move or remove placements as relationships change.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-text">Your trees</h2>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-app-md border border-border bg-surface-muted p-0.5" role="group" aria-label="Overview layout">
              <button
                type="button"
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-app-sm px-2.5 text-xs font-semibold transition-colors ${overviewView === 'map' ? 'bg-surface text-primary shadow-app-sm' : 'text-muted hover:text-text'}`}
                onClick={() => setOverviewView('map')}
                aria-pressed={overviewView === 'map'}
              >
                <Network className="h-3.5 w-3.5" />
                Map
              </button>
              <button
                type="button"
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-app-sm px-2.5 text-xs font-semibold transition-colors ${overviewView === 'cards' ? 'bg-surface text-primary shadow-app-sm' : 'text-muted hover:text-text'}`}
                onClick={() => setOverviewView('cards')}
                aria-pressed={overviewView === 'cards'}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Cards
              </button>
            </div>
            <button type="button" className="app-button-primary" onClick={() => setShowCreate((open) => !open)}>
              <Plus className="h-4 w-4" />
              New tree
            </button>
          </div>
        </div>

        {showCreate && (
          <div className="app-panel space-y-3 p-4">
            <div>
              <label className="app-label" htmlFor="tree-name">Tree name</label>
              <input id="tree-name" className="app-input" placeholder="e.g. CLC Discipleship 2026" value={newTreeName} maxLength={80} onChange={(event) => setNewTreeName(event.target.value)} />
            </div>
            <div>
              <label className="app-label" htmlFor="tree-description">Description (optional)</label>
              <input id="tree-description" className="app-input" placeholder="What is this tree for?" value={newTreeDescription} maxLength={500} onChange={(event) => setNewTreeDescription(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="app-button-secondary" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</button>
              <button type="button" className="app-button-primary" onClick={() => void handleCreateTree()} disabled={creating || !newTreeName.trim()}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {creating ? 'Creating...' : 'Create tree'}
              </button>
            </div>
          </div>
        )}

        {actionError && <p className="app-alert-error" role="alert">{actionError}</p>}

        {treesLoading || !nodesLoaded ? (
          <div className="app-loading-state">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="mt-2 text-sm text-muted">Loading trees and placements...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Global stat chips intentionally omitted while the map is the default view;
                per-tree numbers live in each map header. */}

            {trees.length === 0 ? (
              <div className="app-empty-state">
                <ListTree className="h-6 w-6 text-primary" />
                <p className="mt-2 text-sm font-semibold text-text">No trees yet</p>
                <p className="mt-1 text-sm text-muted">Create your first tree to start placing people.</p>
              </div>
            ) : overviewView === 'map' ? (
              <DiscipleshipTreeOverview
                trees={trees}
                forestByTree={forestByTree}
                overviewByTree={overviewByTree}
                duplicateTreeCounts={duplicateTreeCounts}
                collapsedIds={mapCollapsedIds}
                onToggleCollapse={toggleMapCollapsed}
                activeNodeId={profileNode?.id ?? null}
                onOpenTree={(treeId) => openTree(treeId)}
                onOpenNode={(node) => setProfileNode(node)}
              />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {trees.map((tree) => (
                  <li key={tree.id} className="app-panel flex flex-col gap-3 p-4">
                    <button type="button" className="flex items-start justify-between gap-3 text-left" onClick={() => openTree(tree.id)}>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-base font-bold text-text">
                          <Network className="h-4 w-4 shrink-0 text-primary" />
                          <span className="truncate">{tree.name}</span>
                        </span>
                        {tree.description && <span className="mt-1 block text-sm text-muted">{tree.description}</span>}
                        <span className="mt-1 block text-xs text-muted">
                          {(() => {
                            const stats = overviewByTree.get(tree.id);
                            const total = stats?.total ?? 0;
                            const roots = stats?.rootCount ?? 0;
                            const members = stats?.memberCount ?? 0;
                            const contacts = stats?.contactCount ?? 0;
                            const levels = (stats?.maxDepth ?? -1) + 1;
                            return `${total} ${total === 1 ? 'person' : 'people'} · ${roots} root${roots === 1 ? '' : 's'} · ${members} members / ${contacts} contacts · ${levels} level${levels === 1 ? '' : 's'}`;
                          })()}
                          {/* {tree.createdByName ? ` · by ${tree.createdByName}` : ''} */}
                        </span>
                      </span>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted" />
                    </button>
                    {/* Kept outside the open button: a button may not nest inside another button. */}
                    <RootsPreview stats={overviewByTree.get(tree.id)} onOpen={(nodeId) => openTree(tree.id, nodeId)} />
                    <div className="flex justify-end">
                      <button type="button" className="app-button-text hover:text-error" onClick={() => void handleDeleteTree(tree)} disabled={busy}>
                        <Trash2 className="h-4 w-4" />
                        Delete tree
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {profileNode && (
          <NodeProfileDrawer
            key={`${profileNode.nodeType}:${profileNode.refId}`}
            node={profileNode}
            onClose={() => setProfileNode(null)}
          />
        )}
      </section>
    );
  }

  // --- Tree detail view ---
  return (
    <section className="mx-auto max-w-5xl space-y-4 pb-6">
      <div className="home-page-hero -mx-4 -mt-6 bg-primary px-4 py-6 text-white sm:-mx-6 sm:-mt-8 sm:px-8">
        <button type="button" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/85 transition-colors hover:text-white" onClick={closeTree}>
          <ArrowLeft className="h-3.5 w-3.5" />
          All trees
        </button>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-2xl font-bold sm:text-3xl">{selectedTree?.name ?? 'Tree'}</p>
            <p className="mt-1 text-sm text-white/85">{nodes.length} {nodes.length === 1 ? 'person' : 'people'} placed</p>
          </div>
        </div>
      </div>

      {movingNode ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-app-md border border-primary bg-primary-soft px-3 py-2 text-sm text-primary">
          <span className="font-semibold">Moving {movingNode.displayName} — tap a new discipler, or make them a root.</span>
          <span className="flex items-center gap-2">
            <button type="button" className="app-button-secondary min-h-9 px-3 py-1.5 text-xs" onClick={() => void handleSelectParent(null)} disabled={busy}>Make root</button>
            <button type="button" className="app-button-text min-h-9 px-2 py-1.5 text-xs" onClick={() => setMovingNodeId(null)} disabled={busy}>Cancel</button>
          </span>
        </div>
      ) : placementTargetName ? (
        <div className="flex items-center justify-between gap-2 rounded-app-md border border-primary-muted bg-primary-soft px-3 py-2 text-sm text-primary">
          <span className="font-semibold">Adding someone under {placementTargetName}</span>
          <button type="button" className="app-icon-button size-7" onClick={() => setPlacementTargetId(null)} aria-label="Stop adding under this node">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {actionError && <p className="app-alert-error" role="alert">{actionError}</p>}
      {error && (
        <p className="app-alert-error" role="alert">
          {error}
          <button type="button" className="ml-auto app-button-text min-h-8 px-2 py-1 text-xs" onClick={() => setError(null)}>Dismiss</button>
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="app-panel space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-text">Tree</h2>
              <div className="inline-flex rounded-app-md border border-border bg-surface-muted p-0.5" role="group" aria-label="Tree layout">
                <button type="button" className={`inline-flex min-h-8 items-center gap-1.5 rounded-app-sm px-2.5 text-xs font-semibold transition-colors ${view === 'chart' ? 'bg-surface text-primary shadow-app-sm' : 'text-muted hover:text-text'}`} onClick={() => setView('chart')} aria-pressed={view === 'chart'}>
                  <Network className="h-3.5 w-3.5" />
                  Chart
                </button>
                <button type="button" className={`inline-flex min-h-8 items-center gap-1.5 rounded-app-sm px-2.5 text-xs font-semibold transition-colors ${view === 'list' ? 'bg-surface text-primary shadow-app-sm' : 'text-muted hover:text-text'}`} onClick={() => setView('list')} aria-pressed={view === 'list'}>
                  <ListTree className="h-3.5 w-3.5" />
                  List
                </button>
              </div>
            </div>
            {view === 'list' && placementTargetId === null && <span className="text-xs text-muted">Tip: use ＋ to add someone under a person</span>}
            {view === 'chart' && <span className="text-xs text-muted">Scroll sideways to explore the branches</span>}
          </div>

          {nodesLoading ? (
            <div className="flex min-h-40 items-center justify-center text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : nodes.length === 0 ? (
            <div className="app-empty-state min-h-40">
              <Network className="h-5 w-5 text-primary" />
              <p className="mt-2 text-sm font-semibold text-text">This tree is empty</p>
              <p className="mt-1 text-sm text-muted">Pick a person from the panel to place them at the top level.</p>
            </div>
          ) : view === 'chart' ? (
            <DiscipleshipTreeChart {...treeViewProps} />
          ) : (
            <DiscipleshipTreeView {...treeViewProps} />
          )}
        </div>

        <UnplacedPanel
          candidates={candidates}
          placementTargetName={placementTargetName}
          onAdd={(candidate) => void handleAddCandidate(candidate)}
          onClearTarget={() => setPlacementTargetId(null)}
          busy={busy}
        />
      </div>

      {removingNode && (
        <RemoveNodeDialog node={removingNode} nodeById={nodeById} busy={busy} error={actionError} onCancel={() => setRemovingNode(null)} onConfirm={() => void handleRemove()} />
      )}

      {profileNode && (
        <NodeProfileDrawer key={`${profileNode.nodeType}:${profileNode.refId}`} node={profileNode} onClose={() => setProfileNode(null)} />
      )}
    </section>
  );
};
