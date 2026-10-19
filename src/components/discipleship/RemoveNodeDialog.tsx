import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import type { DiscipleshipNode } from '../../types/discipleship';

interface RemoveNodeDialogProps {
  node: DiscipleshipNode;
  nodeById: Map<string, DiscipleshipNode>;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirms a splice-removal and previews exactly what will happen to the
 * node's direct children: reattached to the grandparent, or promoted to roots
 * when the removed node is itself a root.
 */
export const RemoveNodeDialog: React.FC<RemoveNodeDialogProps> = ({
  node,
  nodeById,
  busy,
  error,
  onCancel,
  onConfirm,
}) => {
  const { parent, children, descendants } = useMemo(() => {
    const directChildren = [...nodeById.values()].filter((entry) => entry.parentId === node.id);
    const parentNode = node.parentId ? nodeById.get(node.parentId) ?? null : null;
    const allDescendants = [...nodeById.values()].filter(
      (entry) => entry.id !== node.id && entry.path.length > node.path.length
        && node.path.every((id, index) => entry.path[index] === id),
    );
    return { parent: parentNode, children: directChildren, descendants: allDescendants };
  }, [node, nodeById]);

  const childNames = children.map((child) => child.displayName);
  const target = parent ? parent.displayName : null;

  const summary = (() => {
    if (!children.length) return 'This person will be removed from the tree. They have no one placed beneath them.';
    if (target) {
      return `${childNames.join(', ')} will move up under ${target}.`;
    }
    return `${childNames.join(', ')} will become root node${children.length === 1 ? '' : 's'} at the top of the tree.`;
  })();

  return createPortal(
    <div className="app-modal-backdrop" onClick={onCancel} role="presentation">
      <div
        className="app-modal mx-auto mt-auto max-h-[85vh] w-full max-w-lg space-y-4 overflow-y-auto sm:mt-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-node-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-error-soft text-error">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h2 id="remove-node-title" className="text-lg font-bold text-text">
                Remove {node.displayName} from the tree?
              </h2>
              <p className="mt-1 text-sm text-muted">
                No profiles or contact records are deleted — only this placement.
              </p>
            </div>
          </div>
          <button type="button" className="app-icon-button" onClick={onCancel} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="app-panel-muted space-y-2 p-4 text-sm text-text">
          <p>{summary}</p>
          {children.length > 0 && (
            <ul className="space-y-1 text-muted">
              {children.map((child) => (
                <li key={child.id} className="flex items-center gap-2">
                  <span className="text-primary">↳</span>
                  <span className="font-medium text-text">{child.displayName}</span>
                  <span>
                    {target ? `rejoins ${target}` : 'becomes a root node'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {descendants.length > children.length && (
            <p className="text-xs text-muted">
              {descendants.length - children.length} deeper descendant
              {descendants.length - children.length === 1 ? '' : 's'} keep their current discipler and stay attached.
            </p>
          )}
        </div>

        {error && <p className="app-alert-error" role="alert">{error}</p>}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="app-button-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app-md bg-error px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onConfirm}
            disabled={busy}
          >
            <Trash2 className="h-4 w-4" />
            {busy ? 'Removing...' : 'Remove from tree'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
