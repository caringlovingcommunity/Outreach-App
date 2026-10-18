import React, { useMemo } from 'react';
import { ChevronDown, ChevronRight, MoveRight, Plus, Trash2, UserRound } from 'lucide-react';
import type { DiscipleshipNode, DiscipleshipTreeNode } from '../../types/discipleship';
import type { DiscipleshipTreeViewProps } from './treeInteractions';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 86;
const H_GAP = 20;
const V_GAP = 54;

interface PositionedNode {
  id: string;
  node: DiscipleshipNode;
  /** Horizontal centre. */
  x: number;
  /** Top edge. */
  y: number;
  /** Descendants hidden behind a collapsed node. */
  hiddenCount: number;
  childCount: number;
}

interface Edge {
  id: string;
  parentX: number;
  parentBottom: number;
  childX: number;
  childTop: number;
}

interface Layout {
  nodes: PositionedNode[];
  edges: Edge[];
  width: number;
  height: number;
}

const countDescendants = (entry: DiscipleshipTreeNode): number =>
  entry.children.reduce((total, child) => total + 1 + countDescendants(child), 0);

/**
 * Tidy-tree layout: leaves consume sequential horizontal slots, parents are
 * centred over their visible children. Collapsed nodes are laid out as leaves,
 * so a big tree stays readable instead of growing forever sideways.
 */
const layoutForest = (forest: DiscipleshipTreeNode[], expandedIds: Set<string>): Layout => {
  const nodes: PositionedNode[] = [];
  const edges: Edge[] = [];
  let cursor = 0;
  let maxDepth = 0;

  const place = (entry: DiscipleshipTreeNode, depth: number): PositionedNode => {
    maxDepth = Math.max(maxDepth, depth);
    const isExpanded = expandedIds.has(entry.node.id);
    const visibleChildren = isExpanded ? entry.children : [];

    let x: number;
    if (visibleChildren.length === 0) {
      x = cursor + NODE_WIDTH / 2;
      cursor += NODE_WIDTH + H_GAP;
    } else {
      const placedChildren = visibleChildren.map((child) => place(child, depth + 1));
      x = (placedChildren[0].x + placedChildren[placedChildren.length - 1].x) / 2;
    }

    const positioned: PositionedNode = {
      id: entry.node.id,
      node: entry.node,
      x,
      y: depth * (NODE_HEIGHT + V_GAP),
      hiddenCount: isExpanded ? 0 : countDescendants(entry),
      childCount: entry.children.length,
    };
    nodes.push(positioned);
    return positioned;
  };

  const positionedById = new Map<string, PositionedNode>();
  forest.forEach((root) => {
    place(root, 0);
  });
  nodes.forEach((positioned) => positionedById.set(positioned.id, positioned));

  // Re-walk the visible hierarchy now that every node has coordinates.
  const collectEdges = (entry: DiscipleshipTreeNode) => {
    const parent = positionedById.get(entry.node.id);
    if (!parent) return;
    const visibleChildren = expandedIds.has(entry.node.id) ? entry.children : [];
    visibleChildren.forEach((child) => {
      const childPosition = positionedById.get(child.node.id);
      if (!childPosition) return;
      edges.push({
        id: `${parent.id}->${child.node.id}`,
        parentX: parent.x,
        parentBottom: parent.y + NODE_HEIGHT,
        childX: childPosition.x,
        childTop: childPosition.y,
      });
      collectEdges(child);
    });
  };
  forest.forEach(collectEdges);

  return {
    nodes,
    edges,
    width: Math.max(cursor - H_GAP, NODE_WIDTH),
    height: (maxDepth + 1) * NODE_HEIGHT + maxDepth * V_GAP,
  };
};

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
      style={{ left: positioned.x - NODE_WIDTH / 2, top: positioned.y, width: NODE_WIDTH }}
    >
      <div
        id={`discipleship-node-${node.id}`}
        className={`flex h-[86px] flex-col rounded-app-lg border bg-surface p-2.5 shadow-app-sm transition-colors ${
          isFocused ? 'ring-2 ring-primary ring-offset-2'
            : isMoving ? 'border-primary bg-primary-soft'
              : isDropDisabled ? 'border-border opacity-40'
                : mode === 'move' ? 'border-dashed border-primary-muted hover:border-primary'
                  : isPlacementTarget ? 'border-primary bg-primary-soft'
                    : 'border-border hover:border-primary-muted'
        }`}
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
            <span className="shrink-0 rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold text-primary">
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

  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="relative mx-auto"
        style={{ width: layout.width, minWidth: layout.width, height: layout.height }}
      >
        <svg
          className="pointer-events-none absolute left-0 top-0"
          width={layout.width}
          height={layout.height}
          aria-hidden="true"
        >
          {layout.edges.map((edge) => {
            const midY = edge.parentBottom + V_GAP / 2;
            return (
              <path
                key={edge.id}
                d={`M ${edge.parentX} ${edge.parentBottom} L ${edge.parentX} ${midY} L ${edge.childX} ${midY} L ${edge.childX} ${edge.childTop}`}
                fill="none"
                stroke="var(--color-primary-muted)"
                strokeWidth={1.5}
                strokeLinecap="round"
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
