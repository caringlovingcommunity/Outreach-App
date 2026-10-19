import type { DiscipleshipNode, DiscipleshipTreeNode } from '../../types/discipleship';

export type TreeMode = 'browse' | 'move';

export interface DiscipleshipTreeViewProps {
  forest: DiscipleshipTreeNode[];
  expandedIds: Set<string>;
  onToggleExpanded: (nodeId: string) => void;
  /**
   * Whether the viewer may add, move and remove people. Students browse the
   * tree but never edit it, so the controls are left out entirely rather than
   * rendered disabled — the backend refuses those writes anyway.
   */
  canEditNodes: boolean;
  mode: TreeMode;
  movingNode: DiscipleshipNode | null;
  canDropOn: (node: DiscipleshipNode) => boolean;
  onSelectParent: (parentId: string | null) => void;
  onStartMove: (node: DiscipleshipNode) => void;
  onAddChild: (node: DiscipleshipNode) => void;
  onRemove: (node: DiscipleshipNode) => void;
  onOpenProfile: (node: DiscipleshipNode) => void;
  placementTargetId: string | null;
  /** Node to highlight after arriving from the overview. */
  focusNodeId?: string | null;
  /**
   * Current profile photos of placed members, keyed by `users_public` UID.
   * Tree nodes store the photo captured when the person was placed, so without
   * this a member would keep showing their old photo after they upload a new one.
   */
  photoByRefId?: Map<string, string>;
}

/**
 * The photo a node should render with.
 *
 * Members resolve to their live profile photo so it always reflects the current
 * `users_public.photoURL`, including a photo the member has since removed.
 * Contacts have no profile document, so their stored photo stays authoritative.
 */
export const resolveNodePhotoUrl = (
  node: DiscipleshipNode,
  photoByRefId?: Map<string, string>,
): string | null => {
  if (node.nodeType !== 'user') return node.photoUrl;
  if (photoByRefId?.has(node.refId)) return photoByRefId.get(node.refId) || null;
  return node.photoUrl;
};
