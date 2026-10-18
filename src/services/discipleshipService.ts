import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import type { DocumentSnapshot, Transaction } from 'firebase/firestore';
import { db } from './firebase';
import type { CreateTreeInput, AddNodeInput, DiscipleshipNode, DiscipleshipTreeNode, DiscipleshipTree } from '../types/discipleship';

const treesCollection = collection(db, 'discipleshipTrees');
const nodesCollection = collection(db, 'discipleshipNodes');

/**
 * Firestore hard limit per batch/transaction. Removals touching more than
 * this many writes fall back to ordered chunked batches (see removeNodeWithChildren).
 */
const MAX_WRITES_PER_COMMIT = 500;

/** Deterministic node doc ID: a person can appear at most once per tree. */
export const discipleshipNodeId = (treeId: string, nodeType: 'user' | 'contact', refId: string): string =>
  `${treeId}__${nodeType === 'user' ? 'u' : 'c'}_${refId}`;

const isPathPrefix = (prefix: string[], path: string[]): boolean =>
  prefix.length <= path.length && prefix.every((id, index) => path[index] === id);

const mapTree = (id: string, data: Record<string, unknown>): DiscipleshipTree => ({
  id,
  name: (data.name as string) || 'Untitled tree',
  description: data.description as string | undefined,
  createdByUid: (data.createdByUid as string) || '',
  createdByName: (data.createdByName as string) || '',
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

const mapNode = (id: string, data: Record<string, unknown>): DiscipleshipNode => ({
  id,
  treeId: data.treeId as string,
  nodeType: data.nodeType as DiscipleshipNode['nodeType'],
  refId: data.refId as string,
  displayName: (data.displayName as string) || '',
  photoUrl: (data.photoUrl as string | null) ?? null,
  parentId: (data.parentId as string | null) ?? null,
  path: Array.isArray(data.path) ? (data.path as string[]) : [id],
  depth: typeof data.depth === 'number' ? data.depth : 0,
  childOrder: typeof data.childOrder === 'number' ? data.childOrder : 0,
  gospelStatus: data.gospelStatus as string | undefined,
  membershipStatus: data.membershipStatus as string | undefined,
  addedByUid: (data.addedByUid as string) || '',
  addedByName: data.addedByName as string | undefined,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

// ---------------------------------------------------------------------------
// Trees
// ---------------------------------------------------------------------------

export const createTree = async (input: CreateTreeInput, user: { uid: string; displayName: string }): Promise<string> => {
  const name = input.name.trim();
  if (!name) throw new Error('Tree name is required.');
  const ref = await addDoc(treesCollection, {
    name,
    ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    createdByUid: user.uid,
    createdByName: user.displayName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const subscribeToTrees = (
  onChange: (trees: DiscipleshipTree[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(treesCollection, orderBy('createdAt', 'desc')),
  (snapshot) => onChange(snapshot.docs.map((entry) => mapTree(entry.id, entry.data()))),
  onError,
);

export const deleteTree = async (treeId: string): Promise<void> => {
  // Delete nodes first (chunked), then the tree shell. A failure between the
  // steps leaves an empty-but-listed tree, which is safe to retry.
  await deleteTreeNodes(treeId);
  await deleteDoc(doc(treesCollection, treeId));
};

const deleteTreeNodes = async (treeId: string): Promise<void> => {
  const snapshot = await getDocs(query(nodesCollection, where('treeId', '==', treeId)));
  const ids = snapshot.docs.map((entry) => entry.id);
  for (let index = 0; index < ids.length; index += MAX_WRITES_PER_COMMIT) {
    const batch = writeBatch(db);
    ids.slice(index, index + MAX_WRITES_PER_COMMIT).forEach((id) => batch.delete(doc(nodesCollection, id)));
    await batch.commit();
  }
};

// ---------------------------------------------------------------------------
// Nodes: subscribe / build
// ---------------------------------------------------------------------------

export const subscribeToTreeNodes = (
  treeId: string,
  onChange: (nodes: DiscipleshipNode[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(nodesCollection, where('treeId', '==', treeId)),
  (snapshot) => onChange(snapshot.docs.map((entry) => mapNode(entry.id, entry.data()))),
  onError,
);

/**
 * Live stream of every node in every tree. The organizer overview needs the
 * whole picture (root previews, cross-tree duplicates, unplaced people), and a
 * single collection listener keeps all of it consistent — no per-tree count
 * queries. Reads only; no composite index required.
 */
export const subscribeToAllNodes = (
  onChange: (nodes: DiscipleshipNode[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  nodesCollection,
  (snapshot) => onChange(snapshot.docs.map((entry) => mapNode(entry.id, entry.data()))),
  onError,
);

export const getTreeNodes = async (treeId: string): Promise<DiscipleshipNode[]> => {
  const snapshot = await getDocs(query(nodesCollection, where('treeId', '==', treeId)));
  return snapshot.docs.map((entry) => mapNode(entry.id, entry.data()));
};

/** Builds a render-ready forest from a flat node list, sorted by childOrder. */
export const buildTreeForest = (nodes: DiscipleshipNode[]): DiscipleshipTreeNode[] => {
  const byId = new Map<string, DiscipleshipTreeNode>();
  nodes.forEach((node) => byId.set(node.id, { node, children: [] }));

  const order = (entries: DiscipleshipTreeNode[]) =>
    entries.sort((a, b) => a.node.childOrder - b.node.childOrder || a.node.displayName.localeCompare(b.node.displayName));

  const roots: DiscipleshipTreeNode[] = [];
  nodes.forEach((node) => {
    const entry = byId.get(node.id)!;
    // A node whose parent is missing (deleted elsewhere) degrades to a root so
    // the UI never silently hides people.
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(entry);
    else roots.push(entry);
  });

  const sortRecursive = (entries: DiscipleshipTreeNode[]) => {
    order(entries);
    entries.forEach((entry) => sortRecursive(entry.children));
  };
  sortRecursive(roots);
  return roots;
};

// ---------------------------------------------------------------------------
// Nodes: add
// ---------------------------------------------------------------------------

export const addNode = async (input: AddNodeInput, addedBy: { uid: string; displayName: string }): Promise<void> => {
  const nodeId = discipleshipNodeId(input.treeId, input.nodeType, input.refId);
  const parentId = input.parentId ?? null;

  await runTransaction(db, async (tx) => {
    const treeSnap = await tx.get(doc(treesCollection, input.treeId));
    if (!treeSnap.exists()) throw new Error('Tree does not exist.');

    const nodeSnap = await tx.get(doc(nodesCollection, nodeId));
    if (nodeSnap.exists()) throw new Error('This person is already in the tree.');

    let parentPath: string[] = [];
    if (parentId) {
      const parentSnap = await tx.get(doc(nodesCollection, parentId));
      if (!parentSnap.exists()) throw new Error('Parent node does not exist.');
      const parent = mapNode(parentSnap.id, parentSnap.data());
      if (parent.treeId !== input.treeId) throw new Error('Parent belongs to a different tree.');
      parentPath = parent.path;
    }

    const path = [...parentPath, nodeId];
    tx.set(doc(nodesCollection, nodeId), {
      treeId: input.treeId,
      nodeType: input.nodeType,
      refId: input.refId,
      displayName: input.displayName.trim(),
      photoUrl: input.photoUrl ?? null,
      parentId,
      path,
      depth: path.length - 1,
      childOrder: typeof input.childOrder === 'number' ? input.childOrder : Date.now(),
      ...(input.gospelStatus ? { gospelStatus: input.gospelStatus } : {}),
      ...(input.membershipStatus ? { membershipStatus: input.membershipStatus } : {}),
      addedByUid: addedBy.uid,
      addedByName: addedBy.displayName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
};

// ---------------------------------------------------------------------------
// Nodes: move (single parent; cycle-free by path-prefix validation)
// ---------------------------------------------------------------------------

/**
 * The web SDK's runTransaction only accepts document gets, so we query the
 * tree's node IDs first, then re-read every one of them fresh inside the
 * transaction (all reads precede all writes, per transaction rules). The
 * re-read is what makes concurrent-move detection work.
 */
const readTreeNodesFresh = async (
  tx: Transaction,
  nodeIds: string[],
): Promise<DiscipleshipNode[]> => {
  const snapshots = await Promise.all(nodeIds.map((id) => tx.get(doc(nodesCollection, id))));
  return snapshots
    .filter((snapshot: DocumentSnapshot) => snapshot.exists())
    .map((snapshot: DocumentSnapshot) => mapNode(snapshot.id, snapshot.data()!));
};

const listTreeNodeIds = async (treeId: string): Promise<string[]> => {
  const snapshot = await getDocs(query(nodesCollection, where('treeId', '==', treeId)));
  return snapshot.docs.map((entry) => entry.id);
};

export const moveNode = async (
  treeId: string,
  nodeId: string,
  newParentId: string | null,
  childOrder?: number,
): Promise<void> => {
  const nodeIds = await listTreeNodeIds(treeId);
  if (!nodeIds.includes(nodeId)) throw new Error('Node not found in this tree.');

  await runTransaction(db, async (tx) => {
    const nodes = await readTreeNodesFresh(tx, nodeIds);
    const node = nodes.find((entry) => entry.id === nodeId);
    if (!node) throw new Error('Node not found in this tree.');

    let parentPath: string[] = [];
    if (newParentId) {
      if (newParentId === nodeId) throw new Error('A node cannot be its own parent.');
      const parent = nodes.find((entry) => entry.id === newParentId);
      if (!parent) throw new Error('Target parent does not exist in this tree.');
      // Cycle rejection: the new parent must not be inside the moved subtree.
      if (isPathPrefix(node.path, parent.path)) {
        throw new Error('Cannot move a node under its own descendant.');
      }
      parentPath = parent.path;
    }

    const oldPath = node.path;
    const newPath = [...parentPath, nodeId];
    const descendants = nodes.filter((entry) => entry.id !== nodeId && isPathPrefix(oldPath, entry.path));
    if (descendants.length + 1 > MAX_WRITES_PER_COMMIT) {
      throw new Error('This subtree is too large to move in one operation.');
    }
    const siblings = nodes.filter((entry) => entry.parentId === newParentId && entry.id !== nodeId);
    const nextChildOrder = typeof childOrder === 'number'
      ? childOrder
      : siblings.reduce((max, entry) => Math.max(max, entry.childOrder), -1) + 1;

    tx.update(doc(nodesCollection, nodeId), {
      parentId: newParentId,
      path: newPath,
      depth: newPath.length - 1,
      childOrder: nextChildOrder,
      updatedAt: serverTimestamp(),
    });

    for (const descendant of descendants) {
      const suffix = descendant.path.slice(oldPath.length);
      const path = [...newPath, ...suffix];
      tx.update(doc(nodesCollection, descendant.id), {
        path,
        depth: path.length - 1,
        updatedAt: serverTimestamp(),
      });
    }
  });
};

// ---------------------------------------------------------------------------
// Nodes: remove with splice semantics (per spec)
//
// 1. Reattach direct children to the removed node's parent.
// 2. If the removed node is a root, its children become roots.
// 3. Delete ONLY the selected node — descendants are updated, never deleted.
// 4. All other node data, relationships, and membership records are preserved.
// 5. Single atomic transaction when it fits Firestore's 500-write limit;
//    otherwise ordered chunked batches (shallowest updates first, delete LAST)
//    so an interrupted run degrades to "node still present but childless" —
//    never orphaned or duplicated children. The operation is idempotent:
//    re-running it recomputes from current state and finishes the job.
// ---------------------------------------------------------------------------

interface RepathUpdate {
  id: string;
  parentId: string | null;
  path: string[];
  depth: number;
}

const computeRemovalPlan = (
  nodes: DiscipleshipNode[],
  nodeId: string,
): { node: DiscipleshipNode; updates: RepathUpdate[] } => {
  const node = nodes.find((entry) => entry.id === nodeId);
  if (!node) throw new Error('Node not found in this tree.');

  // Tolerate a dangling parent reference by treating the node as a root.
  const parent = node.parentId ? nodes.find((entry) => entry.id === node.parentId) : null;
  const effectiveParentId = parent ? parent.id : null;
  const newParentPath = parent ? parent.path : [];

  // Shallowest-first so chunked commits keep every path consistent as they go.
  const descendants = nodes
    .filter((entry) => entry.id !== nodeId && isPathPrefix(node.path, entry.path))
    .sort((a, b) => a.path.length - b.path.length);

  const updates: RepathUpdate[] = descendants.map((descendant) => ({
    id: descendant.id,
    // Direct children of the removed node reattach to the grandparent;
    // deeper descendants keep their immediate parent (which is being repathed).
    parentId: descendant.parentId === nodeId ? effectiveParentId : descendant.parentId,
    path: [...newParentPath, ...descendant.path.slice(node.path.length)],
    depth: 0, // set below
  }));

  updates.forEach((update) => { update.depth = update.path.length - 1; });
  return { node, updates };
};

export const removeNodeWithChildren = async (treeId: string, nodeId: string): Promise<void> => {
  const nodeIds = await listTreeNodeIds(treeId);
  if (!nodeIds.includes(nodeId)) throw new Error('Node not found in this tree.');

  const deferred = await runTransaction(db, async (tx): Promise<RepathUpdate[] | null> => {
    const nodes = await readTreeNodesFresh(tx, nodeIds);
    const { node, updates } = computeRemovalPlan(nodes, nodeId);

    if (updates.length + 1 <= MAX_WRITES_PER_COMMIT) {
      for (const update of updates) {
        tx.update(doc(nodesCollection, update.id), {
          parentId: update.parentId,
          path: update.path,
          depth: update.depth,
          updatedAt: serverTimestamp(),
        });
      }
      tx.delete(doc(nodesCollection, node.id));
      return null;
    }

    // Too large for one atomic commit: keep the transaction as the validation
    // read, then apply ordered chunks outside it.
    return updates;
  });

  if (deferred === null) return;

  for (let index = 0; index < deferred.length; index += MAX_WRITES_PER_COMMIT) {
    const batch = writeBatch(db);
    deferred.slice(index, index + MAX_WRITES_PER_COMMIT).forEach((update) => {
      batch.update(doc(nodesCollection, update.id), {
        parentId: update.parentId,
        path: update.path,
        depth: update.depth,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }

  // Delete last: if any update chunk failed, the node still exists (childless
  // at worst), so the tree remains consistent and the operation retryable.
  await deleteDoc(doc(nodesCollection, nodeId));
};

// ---------------------------------------------------------------------------
// Unplaced candidates (for the placement panel)
// ---------------------------------------------------------------------------

export const getPlacedRefIds = async (treeId: string): Promise<Set<string>> => {
  const nodes = await getTreeNodes(treeId);
  return new Set(nodes.map((node) => `${node.nodeType}:${node.refId}`));
};

/** Convenience used by the UI to refresh a denormalized snapshot. */
export const refreshNodeSnapshot = async (
  nodeId: string,
  snapshot: { displayName?: string; photoUrl?: string | null; gospelStatus?: string; membershipStatus?: string },
): Promise<void> => {
  const clean: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (snapshot.displayName !== undefined) clean.displayName = snapshot.displayName;
  if (snapshot.photoUrl !== undefined) clean.photoUrl = snapshot.photoUrl;
  if (snapshot.gospelStatus !== undefined) clean.gospelStatus = snapshot.gospelStatus;
  if (snapshot.membershipStatus !== undefined) clean.membershipStatus = snapshot.membershipStatus;
  await updateDoc(doc(nodesCollection, nodeId), clean);
};
