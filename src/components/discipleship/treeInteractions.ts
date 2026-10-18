import type { DiscipleshipNode, DiscipleshipTreeNode } from '../../types/discipleship';

export type TreeMode = 'browse' | 'move';

export interface DiscipleshipTreeViewProps {
  forest: DiscipleshipTreeNode[];
  expandedIds: Set<string>;
  onToggleExpanded: (nodeId: string) => void;
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
