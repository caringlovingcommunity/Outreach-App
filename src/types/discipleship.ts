// src/types/discipleship.ts

export type DiscipleshipNodeType = 'user' | 'contact';

export interface DiscipleshipTree {
  id: string;
  name: string;
  description?: string;
  createdByUid: string;
  createdByName: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface DiscipleshipNode {
  /** Deterministic ID: `${treeId}__u_${uid}` or `${treeId}__c_${contactId}` */
  id: string;
  treeId: string;
  nodeType: DiscipleshipNodeType;
  /** users_public UID or contacts document ID, depending on nodeType. */
  refId: string;
  /** Denormalized snapshot for instant rendering (no joins). */
  displayName: string;
  photoUrl: string | null;
  /** Node parent doc ID; null when the node is a root. */
  parentId: string | null;
  /**
   * Full ancestor chain ending with this node's own ID.
   * Root nodes have `[ownId]`. Used for subtree queries, breadcrumbs,
   * and cycle rejection (`nodeId not in newParent.path`).
   */
  path: string[];
  /** `path.length - 1`. */
  depth: number;
  /** Sibling ordering (ascending). */
  childOrder: number;
  /** Optional snapshots for status badges in the tree UI. */
  gospelStatus?: string;
  membershipStatus?: string;
  addedByUid: string;
  addedByName?: string;
  createdAt?: any;
  updatedAt?: any;
}

/** A node plus its children, as rendered by the tree view. */
export interface DiscipleshipTreeNode {
  node: DiscipleshipNode;
  children: DiscipleshipTreeNode[];
}

export interface CreateTreeInput {
  name: string;
  description?: string;
}

export interface UpdateTreeInput {
  name: string;
  description?: string;
}

export interface AddNodeInput {
  treeId: string;
  nodeType: DiscipleshipNodeType;
  refId: string;
  displayName: string;
  photoUrl?: string | null;
  gospelStatus?: string;
  membershipStatus?: string;
  parentId?: string | null;
  childOrder?: number;
}
