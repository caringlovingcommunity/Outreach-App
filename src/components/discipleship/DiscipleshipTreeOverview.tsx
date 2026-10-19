import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Maximize2, Network, UserRound, ZoomIn, ZoomOut } from 'lucide-react';
import { layoutForest, type Layout, type PositionedNode } from './treeLayout';
import type { TreeOverviewStats } from '../../hooks/useDiscipleshipTree';
import type { DiscipleshipNode, DiscipleshipTreeNode, DiscipleshipTree } from '../../types/discipleship';

/** Compact geometry: many trees have to share one canvas. */
const NODE_WIDTH_MIN = 172;
/** Tiles grow with the longest name in their tree, up to this. */
const NODE_WIDTH_MAX = 340;
const NODE_HEIGHT = 60;
const H_GAP = 14;
const V_GAP = 46;
const TREE_GAP = 44;
const HEADER_HEIGHT = 54;
const EMPTY_TREE_HEIGHT = 120;
/** Chrome around the name: px-2 paddings, avatar, gap, fold control. */
const NAME_CHROME_WIDTH = 80;
const NAME_FONT_WEIGHT = 600;
const NAME_FONT_SIZE = 12;
/**
 * The canvas shrinks until every tree fits the panel, but only so far. Below
 * roughly 70% the 10-12px labels stop being readable at all — a 12px line lands
 * near 8px, and past that it is grey mush rather than text — so past the floor
 * the panel scrolls sideways instead, which is what it did originally.
 */
const MIN_FIT_SCALE = 0.7;
/** Each tap on +/− moves the zoom by this much, matching the detail chart. */
const ZOOM_STEP = 1.25;

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
  left: number;
  width: number;
  /** Tile width for this tree, sized to its longest name. */
  nodeWidth: number;
}

interface DiscipleshipTreeOverviewProps {
  trees: DiscipleshipTree[];
  forestByTree: Map<string, DiscipleshipTreeNode[]>;
  overviewByTree: Map<string, TreeOverviewStats>;
  /** refKey -> number of trees that person appears in (only duplicates present). */
  duplicateTreeCounts: Map<string, number>;
  /** Node ids folded in the map. Global ids, so one set covers every tree. */
  collapsedIds: Set<string>;
  onToggleCollapse: (nodeId: string) => void;
  /** Node whose drawer is open, kept ringed so the map keeps context. */
  activeNodeId?: string | null;
  onOpenTree: (treeId: string) => void;
  onOpenNode: (node: DiscipleshipNode) => void;
}

const OverviewNode: React.FC<{
  positioned: PositionedNode;
  treeName: string;
  nodeWidth: number;
  duplicateTreeCount: number;
  isActive: boolean;
  isCollapsed: boolean;
  onOpen: (node: DiscipleshipNode) => void;
  onToggleCollapse: (nodeId: string) => void;
}> = ({ positioned, treeName, nodeWidth, duplicateTreeCount, isActive, isCollapsed, onOpen, onToggleCollapse }) => {
  const { node, hiddenCount, childCount } = positioned;
  const isMember = node.nodeType === 'user';
  const hasChildren = childCount > 0;
  const hiddenLabel = hiddenCount > 0 ? ` · +${hiddenCount} hidden` : '';
  const duplicateLabel = duplicateTreeCount > 1 ? ` · in ${duplicateTreeCount} trees` : '';

  return (
    <div
      className={`absolute flex items-stretch overflow-hidden rounded-app-md border bg-surface text-left transition-colors ${
        isActive ? 'border-primary ring-2 ring-primary ring-offset-1'
          : duplicateTreeCount > 1 ? 'border-primary-muted hover:border-primary'
            : 'border-border hover:border-primary'
      }`}
      style={{ left: positioned.x - nodeWidth / 2, top: positioned.y, width: nodeWidth, height: NODE_HEIGHT }}
    >
      {/* The fold control is a sibling, not a nested button — nesting is invalid HTML. */}
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 px-2 text-left"
        onClick={() => onOpen(node)}
        title={`${node.displayName} — ${isMember ? 'Member' : 'Contact'} in ${treeName}${hiddenLabel}${duplicateLabel}\nOpen profile`}
      >
        <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-[10px] font-bold text-primary">
          {node.photoUrl
            ? <img src={node.photoUrl} alt="" className="h-full w-full object-cover" />
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
      </button>

      {hasChildren && (
        <button
          type="button"
          className="flex w-9 shrink-0 items-center justify-center border-l border-border/70 text-muted transition-colors hover:bg-primary-soft hover:text-primary sm:w-6"
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

const TreeHeader: React.FC<{ block: TreeBlock; onOpenTree: (treeId: string) => void }> = ({ block, onOpenTree }) => {
  const { tree, stats } = block;
  const total = stats?.total ?? 0;
  const roots = stats?.rootCount ?? 0;
  const members = stats?.memberCount ?? 0;
  const contacts = stats?.contactCount ?? 0;

  return (
    <button
      type="button"
      className="group flex w-full items-start justify-between gap-2 text-left"
      style={{ height: HEADER_HEIGHT }}
      onClick={() => onOpenTree(tree.id)}
      title={`Open ${tree.name}`}
    >
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-bold text-text group-hover:text-primary">
          <Network className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate">{tree.name}</span>
        </span>
        <span className="mt-1 block text-[11px] text-muted">
          {total} {total === 1 ? 'person' : 'people'} · {roots} root{roots === 1 ? '' : 's'} · {members}M / {contacts}C
        </span>
      </span>
      <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted transition-colors group-hover:text-primary" />
    </button>
  );
};

export const DiscipleshipTreeOverview: React.FC<DiscipleshipTreeOverviewProps> = ({
  trees,
  forestByTree,
  overviewByTree,
  duplicateTreeCounts,
  collapsedIds,
  onToggleCollapse,
  activeNodeId,
  onOpenTree,
  onOpenNode,
}) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [panelWidth, setPanelWidth] = useState(0);
  /** User zoom over the fit scale. 1 is "fitted"; never scales past 1x. */
  const [zoom, setZoom] = useState(1);

  // Measured, not assumed: the panel is full-bleed on a phone and sits inside
  // the page padding on desktop, so the fit scale has to follow the real width.
  useEffect(() => {
    const element = scrollerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setPanelWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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

  const blocks = useMemo<TreeBlock[]>(() => {
    const entries = trees.map((tree) => {
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
      };
    });

    // Tree count is small (tens), so prefix sums keep this mutation-free and clear.
    return entries.map((entry, index) => ({
      ...entry,
      left: entries.slice(0, index).reduce((sum, previous) => sum + previous.width + TREE_GAP, 0),
    }));
  }, [trees, forestByTree, overviewByTree, expandedByTree, nodeWidthByTree]);

  const totalWidth = blocks.length ? blocks[blocks.length - 1].left + blocks[blocks.length - 1].width : 0;
  const maxContentHeight = blocks.reduce(
    (tallest, block) => Math.max(tallest, block.layout.nodes.length ? block.layout.height : EMPTY_TREE_HEIGHT),
    EMPTY_TREE_HEIGHT,
  );
  const canvasHeight = HEADER_HEIGHT + maxContentHeight;
  const peopleShown = blocks.reduce((total, block) => total + block.layout.nodes.length, 0);

  // Shrink the canvas until every tree fits the panel, but never past the point
  // where the labels stop reading — past the floor the panel scrolls instead.
  // `contentRect` is already the padding-excluded inner width.
  const fitScale = totalWidth > 0 && panelWidth > 0
    ? clamp(MIN_FIT_SCALE, panelWidth / totalWidth, 1)
    : 1;
  // Zoom multiplies the fit scale and changes the layout size, not a transform,
  // so the panel keeps scrolling natively — which is the only way a phone gets
  // real momentum. Capped at 1 so nothing is ever scaled up past its own
  // resolution, which is what makes text look soft.
  const scale = clamp(MIN_FIT_SCALE, fitScale * zoom, 1);
  const fitsWithoutScrolling = totalWidth * scale <= panelWidth + 0.5;
  const canZoomIn = scale < 0.999;
  const canZoomOut = zoom > 1.001;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          {trees.length} {trees.length === 1 ? 'tree' : 'trees'} side by side · {peopleShown} {peopleShown === 1 ? 'person' : 'people'} shown
        </span>
        <span className="hidden sm:inline">
          {fitsWithoutScrolling
            ? `Every tree fits at ${Math.round(scale * 100)}%`
            : 'Scroll sideways to move between trees'}
        </span>
        {/* Same zoom controls as the detail chart, but these change the layout
            size rather than a transform, so the panel keeps its native
            momentum. Desktop fits to the panel, so they are hidden at sm+. */}
        <div data-chart-control className="flex items-center gap-1 sm:hidden">
          <button
            type="button"
            className="app-icon-button size-9 border border-border bg-surface shadow-app-sm"
            onClick={() => setZoom((current) => Math.max(1, current / ZOOM_STEP))}
            disabled={!canZoomOut}
            aria-label="Zoom out of the overview"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="app-icon-button size-9 border border-border bg-surface shadow-app-sm"
            onClick={() => setZoom(1)}
            aria-label="Fit every tree in view"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="app-icon-button size-9 border border-border bg-surface shadow-app-sm"
            onClick={() => setZoom((current) => Math.min(2, current * ZOOM_STEP))}
            disabled={!canZoomIn}
            aria-label="Zoom into the overview"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="snap-x snap-proximity overscroll-x-contain overflow-x-auto rounded-app-md border border-border bg-surface-muted/40 p-4"
      >
        {/* The outer box is the layout size, so zooming grows it and the native
            scroller knows how far it can travel. The inner box does the scaling. */}
        <div
          className="relative mx-auto"
          style={{
            width: totalWidth * scale,
            height: canvasHeight * scale,
          }}
        >
          <div
            className="relative origin-top-left"
            style={{ width: totalWidth, height: canvasHeight, transform: `scale(${scale})` }}
          >
            {blocks.slice(1).map((block) => (
              <span
                key={`divider-${block.tree.id}`}
                aria-hidden="true"
                className="absolute top-0 w-px bg-border/70"
                style={{ left: block.left - TREE_GAP / 2, height: canvasHeight }}
              />
            ))}

            {blocks.map((block) => (
              <div key={block.tree.id} className="absolute top-0 snap-start" style={{ left: block.left, width: block.width }}>
                <TreeHeader block={block} onOpenTree={onOpenTree} />

                <div className="relative" style={{ width: block.width, height: maxContentHeight }}>
                  {block.layout.nodes.length === 0 ? (
                    <div
                      className="flex items-center justify-center rounded-app-md border border-dashed border-border px-3 text-center text-[11px] text-subtle"
                      style={{ height: EMPTY_TREE_HEIGHT }}
                    >
                      No one placed yet
                    </div>
                  ) : (
                    <>
                      <svg
                        className="pointer-events-none absolute left-0 top-0"
                        width={block.width}
                        height={block.layout.height}
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
                            />
                          );
                        })}
                      </svg>

                      {block.layout.nodes.map((positioned) => (
                        <OverviewNode
                          key={positioned.id}
                          positioned={positioned}
                          treeName={block.tree.name}
                          nodeWidth={block.nodeWidth}
                          duplicateTreeCount={duplicateTreeCounts.get(refKeyOf(positioned.node)) ?? 1}
                          isActive={activeNodeId === positioned.node.id}
                          isCollapsed={collapsedIds.has(positioned.node.id)}
                          onOpen={onOpenNode}
                          onToggleCollapse={onToggleCollapse}
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
