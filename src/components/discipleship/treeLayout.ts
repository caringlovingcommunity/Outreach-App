import type { DiscipleshipNode, DiscipleshipTreeNode } from '../../types/discipleship';

/** Default geometry shared by the detail chart and the overview map. */
export const DEFAULT_NODE_WIDTH = 200;
export const DEFAULT_NODE_HEIGHT = 86;
export const DEFAULT_H_GAP = 20;
export const DEFAULT_V_GAP = 54;

export interface PositionedNode {
  id: string;
  node: DiscipleshipNode;
  /** Horizontal centre. */
  x: number;
  /** Top edge. */
  y: number;
  /** Descendants hidden behind a collapsed node or beyond maxDepth. */
  hiddenCount: number;
  childCount: number;
}

export interface Edge {
  id: string;
  parentX: number;
  parentBottom: number;
  childX: number;
  childTop: number;
}

export interface Layout {
  nodes: PositionedNode[];
  edges: Edge[];
  width: number;
  height: number;
}

export interface TreeLayoutOptions {
  /** Levels to render; descendants below this are hidden but counted. Unlimited when omitted. */
  maxDepth?: number;
  nodeWidth?: number;
  nodeHeight?: number;
  hGap?: number;
  vGap?: number;
}

export const countDescendants = (entry: DiscipleshipTreeNode): number =>
  entry.children.reduce((total, child) => total + 1 + countDescendants(child), 0);

/**
 * Tidy-tree layout: leaves consume sequential horizontal slots, parents are
 * centred over their visible children. Collapsed nodes — and nodes past
 * maxDepth — are laid out as leaves, so a big tree stays readable instead of
 * growing forever sideways.
 */
export const layoutForest = (
  forest: DiscipleshipTreeNode[],
  expandedIds: Set<string>,
  options: TreeLayoutOptions = {},
): Layout => {
  const nodeWidth = options.nodeWidth ?? DEFAULT_NODE_WIDTH;
  const nodeHeight = options.nodeHeight ?? DEFAULT_NODE_HEIGHT;
  const hGap = options.hGap ?? DEFAULT_H_GAP;
  const vGap = options.vGap ?? DEFAULT_V_GAP;
  const maxDepth = options.maxDepth ?? Number.POSITIVE_INFINITY;

  const nodes: PositionedNode[] = [];
  const edges: Edge[] = [];
  let cursor = 0;
  let deepestLevel = 0;

  const childrenRendered = (entry: DiscipleshipTreeNode, depth: number): DiscipleshipTreeNode[] =>
    expandedIds.has(entry.node.id) && depth < maxDepth ? entry.children : [];

  const place = (entry: DiscipleshipTreeNode, depth: number): PositionedNode => {
    deepestLevel = Math.max(deepestLevel, depth);
    const visibleChildren = childrenRendered(entry, depth);

    let x: number;
    if (visibleChildren.length === 0) {
      x = cursor + nodeWidth / 2;
      cursor += nodeWidth + hGap;
    } else {
      const placedChildren = visibleChildren.map((child) => place(child, depth + 1));
      x = (placedChildren[0].x + placedChildren[placedChildren.length - 1].x) / 2;
    }

    const positioned: PositionedNode = {
      id: entry.node.id,
      node: entry.node,
      x,
      y: depth * (nodeHeight + vGap),
      hiddenCount: visibleChildren.length > 0 ? 0 : countDescendants(entry),
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
  const collectEdges = (entry: DiscipleshipTreeNode, depth: number) => {
    const parent = positionedById.get(entry.node.id);
    if (!parent) return;
    childrenRendered(entry, depth).forEach((child) => {
      const childPosition = positionedById.get(child.node.id);
      if (!childPosition) return;
      edges.push({
        id: `${parent.id}->${child.node.id}`,
        parentX: parent.x,
        parentBottom: parent.y + nodeHeight,
        childX: childPosition.x,
        childTop: childPosition.y,
      });
      collectEdges(child, depth + 1);
    });
  };
  forest.forEach((root) => collectEdges(root, 0));

  return {
    nodes,
    edges,
    width: Math.max(cursor - hGap, nodeWidth),
    height: (deepestLevel + 1) * nodeHeight + deepestLevel * vGap,
  };
};
