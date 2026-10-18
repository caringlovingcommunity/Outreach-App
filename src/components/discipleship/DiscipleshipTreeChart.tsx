import React, { useMemo } from 'react';
import { ChevronDown, ChevronRight, Maximize2, MoveRight, Plus, Trash2, UserRound, ZoomIn, ZoomOut } from 'lucide-react';
import type { DiscipleshipTreeViewProps } from './treeInteractions';
import { DEFAULT_NODE_HEIGHT, DEFAULT_NODE_WIDTH, DEFAULT_V_GAP, layoutForest, type PositionedNode } from './treeLayout';
import { useChartViewport } from '../../hooks/useChartViewport';

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

          {mode === 'browse' && (
            <span className="flex items-center">
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

export const DiscipleshipTreeChart: React.FC<DiscipleshipTreeViewProps> = (props) => {
  const layout = useMemo(
    () => layoutForest(props.forest, props.expandedIds),
    [props.forest, props.expandedIds],
  );
  const rootId = props.forest[0]?.node.id;
  const rootX = useMemo(
    () => layout.nodes.find((positioned) => positioned.id === rootId)?.x,
    [layout.nodes, rootId],
  );
  const {
    frameRef, touchAction, transform, canZoomIn, canZoomOut,
    zoomIn, zoomOut, fit, onPointerDown, onPointerMove, onPointerUp, onClickCapture,
  } = useChartViewport({ width: layout.width, height: layout.height }, rootX);

  return (
    <div>
      {/* Phones only. The controls sit above the frame rather than floating over
          it: at 19.5:9 the frame is too short to pan a node's own buttons out
          from under an overlay. */}
      <div className="flex items-center justify-between gap-2 pb-2 sm:hidden">
        <span className="text-xs text-muted">Drag to pan, pinch or zoom</span>
        <div data-chart-control className="flex items-center gap-1">
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
      </div>

      <div className="pb-2">
        {/* Phones: a 19.5:9 window onto the tree that pans and pinches in place.
            sm+: the original native scroller, with the transform forced off. */}
        <div
          ref={frameRef}
          className="app-chart-frame relative aspect-[19.5/9] select-none overflow-hidden overscroll-contain rounded-app-md sm:aspect-auto sm:select-auto sm:overflow-x-auto sm:overscroll-auto"
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
      </div>
    </div>
  );
};
