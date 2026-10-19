import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Network, UserRound } from 'lucide-react';
import { layoutForest, type Layout, type PositionedNode } from './treeLayout';
import { resolveNodePhotoUrl } from './treeInteractions';
import type { TreeOverviewStats } from '../../hooks/useDiscipleshipTree';
import type { DiscipleshipNode, DiscipleshipTreeNode, DiscipleshipTree } from '../../types/discipleship';

/** Compact geometry: many trees have to share one canvas. */
const NODE_WIDTH_MIN = 172;
/** Tiles grow with the longest name in their tree, up to this. */
const NODE_WIDTH_MAX = 340;
const NODE_HEIGHT = 60;
const H_GAP = 14;
const V_GAP = 46;
const HEADER_HEIGHT = 54;
const EMPTY_TREE_HEIGHT = 120;
/** Chrome around the name: px-2 paddings, avatar, gap, fold control. */
const NAME_CHROME_WIDTH = 80;
const NAME_FONT_WEIGHT = 600;
const NAME_FONT_SIZE = 12;
/**
 * A panel scales its canvas until the whole tree fits its width, so a card
 * shows its tree in full and never needs sideways scrolling to be read as a
 * whole. Fitting a wide tree does soften the 10-12px labels, which is the trade
 * for seeing the shape of every tree at once.
 *
 * `MIN_SCALE` only covers the first paint, before the observer has reported a
 * width: collapsing to it keeps the canvas inside its card for that frame.
 */
const MIN_SCALE = 0.05;

const EMPTY_LAYOUT: Layout = { nodes: [], edges: [], width: NODE_WIDTH_MIN, height: EMPTY_TREE_HEIGHT };

const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';

const refKeyOf = (node: DiscipleshipNode) => `${node.nodeType}:${node.refId}`;

const flattenForest = (forest: DiscipleshipTreeNode[]): DiscipleshipTreeNode[] =>
  forest.flatMap((entry) => [entry, ...flattenForest(entry.children)]);

const clamp = (min: number, value: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Measures a name at the tile's exact font so a tree can grow its columns wide
 * enough to show full names. Falls back to a character estimate without a DOM.
 */
const nameWidthCache = new Map<string, number>();
let measureContext: CanvasRenderingContext2D | null | undefined;

const measureNameWidth = (name: string): number => {
  const cached = nameWidthCache.get(name);
  if (cached !== undefined) return cached;

  if (measureContext === undefined) {
    measureContext = typeof document === 'undefined'
      ? null
      : document.createElement('canvas').getContext('2d');
    if (measureContext) {
      const family = window.getComputedStyle(document.body).fontFamily || 'sans-serif';
      measureContext.font = `${NAME_FONT_WEIGHT} ${NAME_FONT_SIZE}px ${family}`;
    }
  }

  const width = measureContext
    ? measureContext.measureText(name).width
    : name.length * NAME_FONT_SIZE * 0.6;
  nameWidthCache.set(name, width);
  return width;
};

interface TreeBlock {
  tree: DiscipleshipTree;
  stats?: TreeOverviewStats;
  layout: Layout;
  /** Tile width for this tree, sized to its longest name. */
  nodeWidth: number;
  /** Canvas width for this tree alone — the panel is sized to its own content. */
  width: number;
  /** Canvas height for this tree alone, so a panel is only as tall as it needs. */
  height: number;
}

interface DiscipleshipTreeOverviewProps {
  trees: DiscipleshipTree[];
  forestByTree: Map<string, DiscipleshipTreeNode[]>;
  overviewByTree: Map<string, TreeOverviewStats>;
  /** refKey -> number of trees that person appears in (only duplicates present). */
  duplicateTreeCounts: Map<string, number>;
  /** Node ids folded in the map. Global ids, so one set covers every tree. */
  collapsedIds: Set<string>;
  /** Current member photos keyed by `users_public` UID, so tiles are never stale. */
  photoByRefId?: Map<string, string>;
  onToggleCollapse: (nodeId: string) => void;
  onOpenTree: (treeId: string) => void;
}

const OverviewNode: React.FC<{
  positioned: PositionedNode;
  treeName: string;
  nodeWidth: number;
  duplicateTreeCount: number;
  isCollapsed: boolean;
  photoByRefId?: Map<string, string>;
  onToggleCollapse: (nodeId: string) => void;
}> = ({ positioned, treeName, nodeWidth, duplicateTreeCount, isCollapsed, photoByRefId, onToggleCollapse }) => {
  const { node, hiddenCount, childCount } = positioned;
  const isMember = node.nodeType === 'user';
  const photoUrl = resolveNodePhotoUrl(node, photoByRefId);
  const hasChildren = childCount > 0;
  const hiddenLabel = hiddenCount > 0 ? ` · +${hiddenCount} hidden` : '';
  const duplicateLabel = duplicateTreeCount > 1 ? ` · in ${duplicateTreeCount} trees` : '';

  return (
    <div
      className={`absolute flex items-stretch overflow-hidden rounded-app-md border bg-surface text-left ${
        duplicateTreeCount > 1 ? 'border-primary-muted' : 'border-border'
      }`}
      style={{ left: positioned.x - nodeWidth / 2, top: positioned.y, width: nodeWidth, height: NODE_HEIGHT }}
    >
      {/* A tile is a preview, not a target: the whole card opens the tree, so
          the only control a tile carries is the fold one. */}
      <span
        className="flex min-w-0 flex-1 items-center gap-2 px-2"
        title={`${node.displayName} — ${isMember ? 'Member' : 'Contact'} in ${treeName}${hiddenLabel}${duplicateLabel}`}
      >
        <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-[10px] font-bold text-primary">
          {photoUrl
            ? <img src={photoUrl} alt="" className="h-full w-full object-cover" />
            : isMember ? <UserRound className="h-3.5 w-3.5" /> : initials(node.displayName)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 break-words text-xs font-semibold leading-tight text-text">
            {node.displayName}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-muted sm:text-[10px]">
            {isMember ? 'Member' : 'Contact'}{hiddenLabel}{duplicateLabel}
          </span>
        </span>
      </span>

      {hasChildren && (
        <button
          type="button"
          // The card's own button covers this preview, so the fold control opts
          // back into pointer events and sits above it to keep the tap.
          className="pointer-events-auto relative z-30 flex w-9 shrink-0 items-center justify-center border-l border-border/70 text-muted transition-colors hover:bg-primary-soft hover:text-primary sm:w-6"
          onClick={() => onToggleCollapse(node.id)}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? `Expand ${node.displayName}` : `Collapse ${node.displayName}`}
          title={isCollapsed ? `Expand ${node.displayName}` : `Collapse ${node.displayName}`}
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
};

/** Heading only — the card underneath it is what opens the tree. */
const TreeHeader: React.FC<{ block: TreeBlock }> = ({ block }) => {
  const { tree, stats } = block;
  const total = stats?.total ?? 0;
  const roots = stats?.rootCount ?? 0;
  const members = stats?.memberCount ?? 0;
  const contacts = stats?.contactCount ?? 0;

  return (
    <div
      className="flex w-full items-start justify-between gap-2 text-left"
      style={{ height: HEADER_HEIGHT }}
    >
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-bold text-text transition-colors group-hover:text-primary">
          <Network className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate">{tree.name}</span>
        </span>
        <span className="mt-1 block text-[11px] text-muted">
          {total} {total === 1 ? 'person' : 'people'} · {roots} root{roots === 1 ? '' : 's'} · {members}M / {contacts}C
        </span>
      </span>
      <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted transition-colors group-hover:text-primary" />
    </div>
  );
};

/**
 * One tree, one card: a fitted preview of the whole tree that opens that
 * tree's page. Each card measures its own width rather than sharing one, so the
 * fit follows whichever column the app is rendering in.
 */
const TreePanel: React.FC<{
  block: TreeBlock;
  onOpenTree: (treeId: string) => void;
  /** Drawn in canvas coordinates, inside the scaled box. */
  children: React.ReactNode;
}> = ({ block, onOpenTree, children }) => {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [panelWidth, setPanelWidth] = useState(0);

  // Measured, not assumed: cards are full-bleed on a phone and sit inside the
  // page padding on desktop, so the fit has to follow the real width.
  useEffect(() => {
    const element = frameRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setPanelWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { width, height } = block;
  // `contentRect` is already the padding-excluded inner width. The fit is
  // whatever it takes to show the whole tree; `MIN_SCALE` only covers the first
  // paint, before the observer has reported anything.
  const scale = panelWidth > 0 && width > 0 ? Math.min(panelWidth / width, 1) : MIN_SCALE;

  return (
    <section className="group relative rounded-app-md border border-border bg-surface-muted/40 p-3 transition-colors hover:border-primary-muted">
      {/* The card's own target. It lies over the preview so the whole panel
          opens the tree, and the preview is transparent to pointer events, so
          the fold controls on top of it stay the only other thing you can tap.
          A sibling rather than a wrapper, because a button inside a button is
          invalid HTML. */}
      <button
        type="button"
        className="absolute inset-0 z-20 rounded-app-md"
        onClick={() => onOpenTree(block.tree.id)}
        aria-label={`Open ${block.tree.name}`}
        title={`Open ${block.tree.name}`}
      />

      <div className="pointer-events-none relative">
        <TreeHeader block={block} />

        {/* The outer box is the layout size and the inner box does the scaling,
            so a card is only as tall as its own tree needs. */}
        <div ref={frameRef}>
          <div className="relative mx-auto" style={{ width: width * scale, height: height * scale }}>
            <div
              className="relative origin-top-left"
              style={{ width, height, transform: `scale(${scale})` }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const DiscipleshipTreeOverview: React.FC<DiscipleshipTreeOverviewProps> = ({
  trees,
  forestByTree,
  overviewByTree,
  duplicateTreeCounts,
  collapsedIds,
  photoByRefId,
  onToggleCollapse,
  onOpenTree,
}) => {
  // Clean up the module-level nameWidthCache on unmount to prevent memory leaks
  // in long-running sessions where trees are switched frequently.
  useEffect(() => {
    return () => {
      nameWidthCache.clear();
    };
  }, []);

  // Every node renders by default; only explicitly folded ids are left out.
  const expandedByTree = useMemo(() => {
    const expanded = new Map<string, Set<string>>();
    forestByTree.forEach((forest, treeId) => {
      const ids = new Set<string>();
      const walk = (entry: DiscipleshipTreeNode) => {
        if (!collapsedIds.has(entry.node.id)) ids.add(entry.node.id);
        entry.children.forEach(walk);
      };
      forest.forEach(walk);
      expanded.set(treeId, ids);
    });
    return expanded;
  }, [forestByTree, collapsedIds]);

  // Tiles per tree are wide enough for that tree's longest name, so names are
  // never clipped; anything past the cap wraps to a second line instead.
  const nodeWidthByTree = useMemo(() => {
    const widths = new Map<string, number>();
    forestByTree.forEach((forest, treeId) => {
      const widest = flattenForest(forest).reduce(
        (max, entry) => Math.max(max, measureNameWidth(entry.node.displayName)),
        0,
      );
      widths.set(treeId, clamp(NODE_WIDTH_MIN, Math.ceil(widest) + NAME_CHROME_WIDTH, NODE_WIDTH_MAX));
    });
    return widths;
  }, [forestByTree]);

  // Each tree becomes its own panel, so a block only carries what that tree's
  // canvas needs — there is no shared canvas to position it inside.
  const blocks = useMemo<TreeBlock[]>(() => trees.map((tree) => {
    const forest = forestByTree.get(tree.id) ?? [];
    const nodeWidth = nodeWidthByTree.get(tree.id) ?? NODE_WIDTH_MIN;
    const layout = forest.length
      ? layoutForest(forest, expandedByTree.get(tree.id) ?? new Set<string>(), {
        nodeWidth,
        nodeHeight: NODE_HEIGHT,
        hGap: H_GAP,
        vGap: V_GAP,
      })
      : EMPTY_LAYOUT;
    return {
      tree,
      stats: overviewByTree.get(tree.id),
      layout,
      nodeWidth,
      width: Math.max(layout.width, nodeWidth),
      height: layout.nodes.length ? layout.height : EMPTY_TREE_HEIGHT,
    };
  }), [trees, forestByTree, overviewByTree, expandedByTree, nodeWidthByTree]);

  const peopleShown = blocks.reduce((total, block) => total + block.layout.nodes.length, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          {trees.length} {trees.length === 1 ? 'tree' : 'trees'} · {peopleShown} {peopleShown === 1 ? 'person' : 'people'} shown
        </span>
        <span>Tap a card to open that tree</span>
      </div>

      {blocks.map((block) => (
        <TreePanel key={block.tree.id} block={block} onOpenTree={onOpenTree}>
          <svg
            className="pointer-events-none absolute left-0 top-0"
            width={block.width}
            height={block.height}
            aria-hidden="true"
          >
            {block.layout.edges.map((edge) => {
              const midY = edge.parentBottom + V_GAP / 2;
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

          {block.layout.nodes.length === 0 ? (
            <div
              className="flex items-center justify-center rounded-app-md border border-dashed border-border px-3 text-center text-[11px] text-subtle"
              style={{ height: EMPTY_TREE_HEIGHT }}
            >
              No one placed yet
            </div>
          ) : (
            block.layout.nodes.map((positioned) => (
              <OverviewNode
                key={positioned.id}
                positioned={positioned}
                treeName={block.tree.name}
                nodeWidth={block.nodeWidth}
                duplicateTreeCount={duplicateTreeCounts.get(refKeyOf(positioned.node)) ?? 1}
                isCollapsed={collapsedIds.has(positioned.node.id)}
                photoByRefId={photoByRefId}
                onToggleCollapse={onToggleCollapse}
              />
            ))
          )}
        </TreePanel>
      ))}
    </div>
  );
};
