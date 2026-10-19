import React from 'react';
import { ChevronDown, ChevronRight, MoveRight, Plus, Trash2, UserRound } from 'lucide-react';
import type { DiscipleshipTreeNode } from '../../types/discipleship';
import type { DiscipleshipTreeViewProps } from './treeInteractions';

export type { TreeMode } from './treeInteractions';

const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';

const MAX_INDENT_DEPTH = 6;

const NodeRow: React.FC<{
  entry: DiscipleshipTreeNode;
  depth: number;
  props: DiscipleshipTreeViewProps;
}> = ({ entry, depth, props }) => {
  const { node, children } = entry;
  const {
    expandedIds, onToggleExpanded, mode, movingNode, canDropOn,
    onSelectParent, onStartMove, onAddChild, onRemove, onOpenProfile, placementTargetId,
    focusNodeId,
  } = props;

  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isMoving = movingNode?.id === node.id;
  const isDropDisabled = mode === 'move' && !canDropOn(node);
  const isPlacementTarget = placementTargetId === node.id;
  const isMember = node.nodeType === 'user';
  const isFocused = focusNodeId === node.id;

  const handleRowActivate = () => {
    if (mode === 'move') {
      if (!isDropDisabled) onSelectParent(node.id);
      return;
    }
    onOpenProfile(node);
  };

  return (
    <li>
      <div
        className={`group flex min-w-0 items-center gap-1 rounded-app-md border px-2 py-2 transition-colors sm:gap-2 ${
          isFocused ? 'ring-2 ring-primary ring-offset-2'
            : isMoving ? 'border-primary bg-primary-soft'
              : isDropDisabled ? 'cursor-not-allowed border-transparent opacity-40'
                : mode === 'move' ? 'border-dashed border-primary-muted hover:bg-primary-soft'
                  : isPlacementTarget ? 'border-primary bg-primary-soft'
                    : 'border-transparent hover:bg-surface-muted'
        }`}
        id={`discipleship-node-${node.id}`}
      >
        <button
          type="button"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-primary-soft hover:text-primary disabled:opacity-30"
          onClick={() => hasChildren && onToggleExpanded(node.id)}
          aria-label={hasChildren ? (isExpanded ? `Collapse ${node.displayName}` : `Expand ${node.displayName}`) : undefined}
          aria-expanded={hasChildren ? isExpanded : undefined}
          disabled={!hasChildren}
        >
          {hasChildren ? (isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <span className="h-1.5 w-1.5 rounded-full bg-primary-muted" />}
        </button>

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          onClick={handleRowActivate}
          disabled={isDropDisabled}
          title={mode === 'move' ? `Move here under ${node.displayName}` : 'View profile'}
        >
          <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-xs font-bold text-primary">
            {node.photoUrl
              ? <img src={node.photoUrl} alt="" className="h-full w-full object-cover" />
              : isMember ? <UserRound className="h-4 w-4" /> : initials(node.displayName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-text">{node.displayName}</span>
              {!isMember && (
                <span className="shrink-0 rounded border border-primary-muted bg-primary-soft px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary sm:text-[10px]">
                  Contact
                </span>
              )}
              {isPlacementTarget && mode === 'browse' && (
                <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-primary sm:text-[10px]">Adding here</span>
              )}
            </span>
            {hasChildren && (
              <span className="block text-xs text-muted">
                {children.length} direct {children.length === 1 ? 'disciple' : 'disciples'}
              </span>
            )}
          </span>
        </button>

        {mode === 'browse' && (
          <span className="grid w-[6.75rem] shrink-0 grid-cols-3 items-center sm:w-[8.25rem]">
            <button
              type="button"
              className="app-icon-button size-9 justify-self-center sm:size-11"
              title={`Add someone under ${node.displayName}`}
              onClick={() => onAddChild(node)}
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="app-icon-button size-9 justify-self-center sm:size-11"
              title={`Move ${node.displayName}`}
              onClick={() => onStartMove(node)}
            >
              <MoveRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="app-icon-button size-9 justify-self-center hover:text-error sm:size-11"
              title={`Remove ${node.displayName} from the tree`}
              onClick={() => onRemove(node)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <ul className={`${depth < MAX_INDENT_DEPTH ? 'ml-2 sm:ml-4' : 'ml-0'} mt-1 space-y-1 border-l border-border/70`}>
          {children.map((child) => (
            <NodeRow key={child.node.id} entry={child} depth={depth + 1} props={props} />
          ))}
        </ul>
      )}
    </li>
  );
};

export const DiscipleshipTreeView: React.FC<DiscipleshipTreeViewProps> = (props) => (
  <ul className="space-y-1">
    {props.forest.map((entry) => (
      <NodeRow key={entry.node.id} entry={entry} depth={0} props={props} />
    ))}
  </ul>
);
