import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, Maximize2, MoveRight, Plus, Search, Trash2, UserRound, X, ZoomIn, ZoomOut } from 'lucide-react';
import type { DiscipleshipTreeViewProps } from './treeInteractions';
import { DEFAULT_NODE_HEIGHT, DEFAULT_NODE_WIDTH, DEFAULT_V_GAP, layoutForest, type Layout, type PositionedNode } from './treeLayout';
import { useChartViewport, type UseChartViewportResult } from '../../hooks/useChartViewport';

const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';

const ChartNode: React.FC<{
  positioned: PositionedNode;
  props: DiscipleshipTreeViewProps;
}> = ({ positioned, props }) => {
  const { node, hiddenCount } = positioned;
  const {
    expandedIds, onToggleExpanded, mode, movingNode, canDropOn,
    onSelectParent, onStartMove, onAddChild, onRemove, onOpenProfile, placementTargetId,
    focusNodeId,
  } = props;

  const hasChildren = positioned.childCount > 0;
  const isExpanded = expandedIds.has(node.id);
  const isMoving = movingNode?.id === node.id;
  const isDropDisabled = mode === 'move' && !canDropOn(node);
  const isPlacementTarget = placementTargetId === node.id;
  const isMember = node.nodeType === 'user';
  const isFocused = focusNodeId === node.id;

  const activate = () => {
    if (mode === 'move') {
      if (!isDropDisabled) onSelectParent(node.id);
      return;
    }
    onOpenProfile(node);
  };

  return (
    <div
      className="absolute"
      style={{ left: positioned.x - DEFAULT_NODE_WIDTH / 2, top: positioned.y, width: DEFAULT_NODE_WIDTH }}
    >
      <div
        id={`discipleship-node-${node.id}`}
        className={`flex flex-col rounded-app-lg border bg-surface p-2.5 shadow-app-sm transition-colors ${
          isFocused ? 'ring-2 ring-primary ring-offset-2'
            : isMoving ? 'border-primary bg-primary-soft'
              : isDropDisabled ? 'border-border opacity-40'
                : mode === 'move' ? 'border-dashed border-primary-muted hover:border-primary'
                  : isPlacementTarget ? 'border-primary bg-primary-soft'
                    : 'border-border hover:border-primary-muted'
        }`}
        style={{ height: DEFAULT_NODE_HEIGHT }}
      >
        <button
          type="button"
          className="flex min-w-0 items-center gap-2 text-left disabled:cursor-not-allowed"
          onClick={activate}
          disabled={isDropDisabled}
          title={mode === 'move' ? `Move here under ${node.displayName}` : `${node.displayName} — view profile`}
        >
          <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-[11px] font-bold text-primary">
            {node.photoUrl
              ? <img src={node.photoUrl} alt="" className="h-full w-full object-cover" />
              : isMember ? <UserRound className="h-4 w-4" /> : initials(node.displayName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-text">{node.displayName}</span>
            <span className="block truncate text-[11px] text-muted">
              {isMember ? 'Member' : 'Contact'}
              {isPlacementTarget && mode === 'browse' ? ' · adding here' : ''}
            </span>
          </span>
        </button>

        <div className="mt-auto flex items-center justify-between gap-1">
          {hasChildren ? (
            <button
              type="button"
              className="inline-flex min-h-6 shrink-0 items-center gap-1 rounded-app-sm px-1.5 text-[11px] font-semibold text-muted transition-colors hover:bg-primary-soft hover:text-primary"
              onClick={() => onToggleExpanded(node.id)}
              aria-label={isExpanded ? `Collapse ${node.displayName}` : `Expand ${node.displayName}`}
              aria-expanded={isExpanded}
            >
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {isExpanded
                ? 'Hide'
                : `${positioned.childCount} disciple${positioned.childCount === 1 ? '' : 's'}`}
            </button>
          ) : (
            <span className="min-h-6 shrink-0 px-1.5 text-[11px] text-subtle">No disciples yet</span>
          )}

          {hiddenCount > 0 && (
            <span className="shrink-0 rounded-full bg-primary-soft px-1.5 py-0.5 text-[11px] font-bold text-primary sm:text-[10px]">
              +{hiddenCount} hidden
            </span>
          )}

          {/* Phones stay view-only: the frame is too small to aim at these, and
              the sheet presents the same tree as its editable self. */}
          {mode === 'browse' && (
            <span className="hidden items-center sm:flex">
              <button type="button" className="app-icon-button size-7" title={`Add someone under ${node.displayName}`} onClick={() => onAddChild(node)}>
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="app-icon-button size-7" title={`Move ${node.displayName}`} onClick={() => onStartMove(node)}>
                <MoveRight className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="app-icon-button size-7 hover:text-error" title={`Remove ${node.displayName} from the tree`} onClick={() => onRemove(node)}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * The frame, canvas and nodes, shared by the inline preview and the full-screen
 * sheet. It owns no viewport state: each caller passes the `useChartViewport`
 * result it wants — the preview seats at 1:1, the sheet fits the branch height.
 */
const TreeCanvas: React.FC<{
  layout: Layout;
  props: DiscipleshipTreeViewProps;
  viewport: UseChartViewportResult;
  frameClassName: string;
}> = ({ layout, props, viewport, frameClassName }) => {
  const {
    frameRef, touchAction, transform,
    onPointerDown, onPointerMove, onPointerUp, onClickCapture,
  } = viewport;

  return (
    <div
      ref={frameRef}
      className={`app-chart-frame relative select-none overflow-hidden overscroll-contain rounded-app-md ${frameClassName}`}
      style={{ touchAction }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={onClickCapture}
    >
      <div
        className="app-chart-canvas relative mx-auto origin-top-left"
        style={{
          width: layout.width,
          minWidth: layout.width,
          height: layout.height,
          transform,
        }}
      >
        <svg
          className="pointer-events-none absolute left-0 top-0"
          width={layout.width}
          height={layout.height}
          aria-hidden="true"
        >
          {layout.edges.map((edge) => {
            const midY = edge.parentBottom + DEFAULT_V_GAP / 2;
            return (
              <path
                key={edge.id}
                d={`M ${edge.parentX} ${edge.parentBottom} L ${edge.parentX} ${midY} L ${edge.childX} ${midY} L ${edge.childX} ${edge.childTop}`}
                fill="none"
                stroke="var(--color-primary-muted)"
                strokeWidth={1.5}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        {layout.nodes.map((positioned) => (
          <ChartNode key={positioned.id} positioned={positioned} props={props} />
        ))}
      </div>
    </div>
  );
};

/**
 * Phones-only teaser. Keeps the 19.5:9 pan/pinch frame so the tree reads in
 * place, but trades the cramped zoom controls for one way in: full-screen.
 */
const InlineTreePreview: React.FC<{
  layout: Layout;
  props: DiscipleshipTreeViewProps;
  anchorX?: number;
  onOpen: () => void;
}> = ({ layout, props, anchorX, onOpen }) => {
  const viewport = useChartViewport(
    { width: layout.width, height: layout.height },
    { anchorX, fitWidth: true },
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-2 pb-2 sm:hidden">
        <span className="text-xs text-muted">Drag to pan, pinch to zoom</span>
        <button
          type="button"
          className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-app-md bg-primary px-3 py-2 text-xs font-semibold text-white shadow-app-sm transition-colors hover:bg-primary-hover"
          onClick={onOpen}
        >
          <Maximize2 className="h-4 w-4" />
          Open full view
        </button>
      </div>

      {/* Phones: a 19.5:9 window onto the tree that pans and pinches in place.
          sm+: the original native scroller, with the transform forced off. */}
      <div className="pb-2">
        <TreeCanvas
          layout={layout}
          props={props}
          viewport={viewport}
          frameClassName="aspect-[4/3] sm:aspect-auto sm:select-auto sm:overflow-x-auto sm:overscroll-auto"
        />
      </div>
    </div>
  );
};

/**
 * Phones-only full-screen sheet. Portal it to the document body so page-level
 * animation/stacking contexts cannot leave the app header or bottom nav above it.
 * The `app-sheet-backdrop` class also locks page scroll; a stray pan cannot
 * dismiss the sheet.
 */
const FullScreenTreeSheet: React.FC<{
  layout: Layout;
  props: DiscipleshipTreeViewProps;
  anchorX?: number;
  onClose: () => void;
  onJump: (nodeId: string) => void;
}> = ({ layout, props, anchorX, onClose, onJump }) => {
  const viewport = useChartViewport({ width: layout.width, height: layout.height }, { anchorX, fitHeight: true });
  const {
    canZoomIn, canZoomOut, zoomIn, zoomOut, fit, centerOn,
  } = viewport;
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Visible people only — a collapsed node's descendants are not on the canvas
  // to jump to, so they should not be offered.
  const people = useMemo(
    () => [...layout.nodes].sort((a, b) => a.node.displayName.localeCompare(b.node.displayName)),
    [layout.nodes],
  );
  const term = query.trim().toLowerCase();
  const matches = term
    ? people.filter((positioned) => positioned.node.displayName.toLowerCase().includes(term))
    : people;

  const selectPerson = (positioned: PositionedNode) => {
    // Seat the node's centre, not its top edge, under the frame's centre.
    centerOn(positioned.x, positioned.y + DEFAULT_NODE_HEIGHT / 2);
    onJump(positioned.id);
    setQuery('');
    setShowResults(false);
  };

  return createPortal(
    <div
      className="app-sheet-backdrop fixed inset-0 z-50 flex flex-col bg-surface sm:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Tree chart"
    >
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-surface px-3 py-2">
        <button type="button" className="app-icon-button size-10" onClick={onClose} aria-label="Close full-screen chart">
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-sm font-bold text-text">Tree chart</h2>
        <div data-chart-control className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="app-icon-button size-9 border border-border bg-surface shadow-app-sm"
            onClick={zoomOut}
            disabled={!canZoomOut}
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="app-icon-button size-9 border border-border bg-surface shadow-app-sm"
            onClick={fit}
            aria-label="Fit the whole tree in view"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="app-icon-button size-9 border border-border bg-surface shadow-app-sm"
            onClick={zoomIn}
            disabled={!canZoomIn}
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="relative border-b border-border px-3 py-2">
        <label className="relative block">
          <span className="sr-only">Find someone in this tree</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <input
            className="app-input pl-9"
            placeholder="Find someone in this tree"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            onBlur={() => window.setTimeout(() => setShowResults(false), 120)}
          />
        </label>

        {showResults && (
          <ul
            // Keep the input's focus so the tap lands on the row, not a blur.
            onMouseDown={(event) => event.preventDefault()}
            className="absolute inset-x-3 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-app-md border border-border bg-surface p-1 shadow-app-lg"
          >
            {matches.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted">No one matches that search.</li>
            ) : (
              matches.map((positioned) => (
                <li key={positioned.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-app-sm px-2 py-2 text-left text-sm transition-colors hover:bg-primary-soft"
                    onClick={() => selectPerson(positioned)}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-[11px] font-bold text-primary">
                      {positioned.node.photoUrl
                        ? <img src={positioned.node.photoUrl} alt="" className="h-full w-full object-cover" />
                        : positioned.node.nodeType === 'user' ? <UserRound className="h-4 w-4" /> : initials(positioned.node.displayName)}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-text">{positioned.node.displayName}</span>
                    <span className="shrink-0 text-[11px] text-muted">
                      {positioned.node.nodeType === 'user' ? 'Member' : 'Contact'}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div className="min-h-0 flex-1 p-3">
        <TreeCanvas layout={layout} props={props} viewport={viewport} frameClassName="h-full w-full" />
      </div>
    </div>,
    document.body,
  );
};

export const DiscipleshipTreeChart: React.FC<DiscipleshipTreeViewProps> = (props) => {
  const [open, setOpen] = useState(false);
  const [jumpNodeId, setJumpNodeId] = useState<string | null>(null);

  const layout = useMemo(
    () => layoutForest(props.forest, props.expandedIds),
    [props.forest, props.expandedIds],
  );
  const rootId = props.forest[0]?.node.id;
  const rootX = useMemo(
    () => layout.nodes.find((positioned) => positioned.id === rootId)?.x,
    [layout.nodes, rootId],
  );

  // Ring the person-jump target for a moment, mirroring the overview's focus.
  useEffect(() => {
    if (!jumpNodeId) return;
    const timer = window.setTimeout(() => setJumpNodeId(null), 2500);
    return () => window.clearTimeout(timer);
  }, [jumpNodeId]);

  const focusNodeId = jumpNodeId ?? props.focusNodeId ?? null;
  const viewProps = focusNodeId === (props.focusNodeId ?? null)
    ? props
    : { ...props, focusNodeId };

  return (
    <div>
      <InlineTreePreview layout={layout} props={viewProps} anchorX={rootX} onOpen={() => setOpen(true)} />
      {open && (
        <FullScreenTreeSheet
          layout={layout}
          props={viewProps}
          anchorX={rootX}
          onClose={() => setOpen(false)}
          onJump={setJumpNodeId}
        />
      )}
    </div>
  );
};
