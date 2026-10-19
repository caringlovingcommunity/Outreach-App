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
}
