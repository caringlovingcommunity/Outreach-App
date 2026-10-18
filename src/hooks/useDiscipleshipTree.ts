import { useEffect, useMemo, useState } from 'react';
import {
  buildTreeForest,
  subscribeToAllNodes,
  subscribeToTrees,
} from '../services/discipleshipService';
import { subscribeToApprovedUsers } from '../services/organizerService';
import { subscribeToContacts } from '../services/contactsService';
import type { DiscipleshipNode, DiscipleshipTreeNode, DiscipleshipTree } from '../types/discipleship';
import type { Contact } from '../types';
import type { PublicUserProfile } from '../types/user';

export interface TreeCandidate {
  nodeType: 'user' | 'contact';
  refId: string;
  displayName: string;
  photoUrl: string | null;
  subtitle: string;
  gospelStatus?: string;
  membershipStatus?: string;
}

/** Per-tree numbers powering the overview cards. */
export interface TreeOverviewStats {
  treeId: string;
  total: number;
  rootCount: number;
  /** Root nodes (or nodes orphaned by a missing parent), ordered like the tree view. */
  rootNodes: DiscipleshipNode[];
  memberCount: number;
  contactCount: number;
  /** Nodes with at least one disciple beneath them. */
  branchCount: number;
  leafCount: number;
  /** Deepest rendered level, 0 for a single-level tree. */
  maxDepth: number;
}

export interface OverviewTotals {
  trees: number;
  placed: number;
  distinctPlaced: number;
  members: number;
  contacts: number;
  duplicates: number;
  unplacedMembers: number;
  unplacedContacts: number;
  /** Deepest rendered level across all trees, 0 when nothing is placed. */
  deepest: number;
}

export interface DuplicatePlacement {
  nodeType: 'user' | 'contact';
  refId: string;
  displayName: string;
  treeIds: string[];
}

const refKey = (nodeType: 'user' | 'contact', refId: string) => `${nodeType}:${refId}`;

const contactSubtitle = (contact: Contact) => {
  const partner = contact.outreachPartnerNames?.length ? ` · ${contact.outreachPartnerNames.length} partner(s)` : '';
  return `Contact · ${contact.gender === 'male' ? 'Male' : 'Female'}${partner}`;
};

const memberSubtitle = (profile: PublicUserProfile) =>
  `Member · ${profile.role === 'admin' ? 'Admin' : profile.role === 'organizer' ? 'Organizer' : 'Student'}`;

const toMemberCandidate = (profile: PublicUserProfile): TreeCandidate => ({
  nodeType: 'user',
  refId: profile.uid,
  displayName: profile.displayName || 'Unnamed member',
  photoUrl: profile.photoURL ?? null,
  subtitle: memberSubtitle(profile),
  membershipStatus: profile.membershipStatus,
});

const toContactCandidate = (contact: Contact): TreeCandidate => ({
  nodeType: 'contact',
  refId: contact.id,
  displayName: contact.name,
  photoUrl: contact.photoUrl ?? null,
  subtitle: contactSubtitle(contact),
  gospelStatus: contact.gospelStatus,
});

/** Stable empty list so memo dependencies don't change identity every render. */
const NO_NODES: DiscipleshipNode[] = [];

export const useDiscipleshipTree = (currentUserId: string) => {
  const [trees, setTrees] = useState<DiscipleshipTree[]>([]);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [allNodes, setAllNodes] = useState<DiscipleshipNode[]>([]);
  const [nodesLoaded, setNodesLoaded] = useState(false);
  const [members, setMembers] = useState<PublicUserProfile[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [treesLoading, setTreesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tree registry.
  useEffect(() => {
    const unsubscribe = subscribeToTrees(
      (nextTrees) => {
        setTrees(nextTrees);
        setTreesLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError.message || 'Unable to load trees.');
        setTreesLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  // Every node in every tree (live). One listener keeps the overview, the
  // selected tree, and the placement panels perfectly in sync with each other.
  useEffect(() => {
    const unsubscribe = subscribeToAllNodes(
      (nextNodes) => {
        setAllNodes(nextNodes);
        setNodesLoaded(true);
      },
      (snapshotError) => {
        setError(snapshotError.message || 'Unable to load placement data.');
        setNodesLoaded(true);
      },
    );
    return unsubscribe;
  }, []);

  // Placement candidates: approved members.
  useEffect(() => {
    const unsubscribe = subscribeToApprovedUsers(
      (users) => setMembers(users),
      () => { /* Directory is optional for the tree screen. */ },
    );
    return unsubscribe;
  }, []);

  // Placement candidates: all contacts ("sheep").
  useEffect(() => {
    if (!currentUserId) return;
    const unsubscribe = subscribeToContacts(
      currentUserId,
      ({ communityContacts }) => setContacts(communityContacts),
      () => { /* Contacts are optional for the tree screen. */ },
    );
    return unsubscribe;
  }, [currentUserId]);

  const nodesByTree = useMemo(() => {
    const grouped = new Map<string, DiscipleshipNode[]>();
    allNodes.forEach((node) => {
      const bucket = grouped.get(node.treeId);
      if (bucket) bucket.push(node);
      else grouped.set(node.treeId, [node]);
    });
    return grouped;
  }, [allNodes]);

  const nodes = selectedTreeId ? nodesByTree.get(selectedTreeId) ?? NO_NODES : NO_NODES;
  const nodesLoading = Boolean(selectedTreeId) && !nodesLoaded;

  const forest: DiscipleshipTreeNode[] = useMemo(() => buildTreeForest(nodes), [nodes]);

  /**
   * Same walk the tree views render, so root counts, branch counts, and depth
   * reported on the overview can never contradict the tree itself.
   */
  const overviewByTree = useMemo(() => {
    const overview = new Map<string, TreeOverviewStats>();
    nodesByTree.forEach((treeNodes, treeId) => {
      const roots = buildTreeForest(treeNodes);
      const rootNodes: DiscipleshipNode[] = [];
      let branchCount = 0;
      let maxDepth = 0;

      const walk = (entry: DiscipleshipTreeNode, level: number) => {
        if (entry.children.length > 0) branchCount += 1;
        maxDepth = Math.max(maxDepth, level);
        entry.children.forEach((child) => walk(child, level + 1));
      };
      roots.forEach((root) => {
        rootNodes.push(root.node);
        walk(root, 0);
      });

      let memberCount = 0;
      treeNodes.forEach((node) => {
        if (node.nodeType === 'user') memberCount += 1;
      });

      overview.set(treeId, {
        treeId,
        total: treeNodes.length,
        rootCount: roots.length,
        rootNodes,
        memberCount,
        contactCount: treeNodes.length - memberCount,
        branchCount,
        leafCount: treeNodes.length - branchCount,
        maxDepth,
      });
    });
    return overview;
  }, [nodesByTree]);

  /** Who is placed where, keyed by person so cross-tree duplicates surface. */
  const placements = useMemo(() => {
    const byPerson = new Map<string, { nodeType: 'user' | 'contact'; refId: string; displayName: string; treeIds: Set<string> }>();
    allNodes.forEach((node) => {
      const key = refKey(node.nodeType, node.refId);
      const existing = byPerson.get(key);
      if (existing) existing.treeIds.add(node.treeId);
      else byPerson.set(key, {
        nodeType: node.nodeType,
        refId: node.refId,
        displayName: node.displayName,
        treeIds: new Set([node.treeId]),
      });
    });
    return byPerson;
  }, [allNodes]);

  const globalPlacedKeys = useMemo(() => new Set(placements.keys()), [placements]);

  const placedKeys = useMemo(() => {
    const keys = new Set<string>();
    nodes.forEach((node) => keys.add(refKey(node.nodeType, node.refId)));
    return keys;
  }, [nodes]);

  const duplicates = useMemo<DuplicatePlacement[]>(
    () => [...placements.values()]
      .filter((entry) => entry.treeIds.size > 1)
      .map((entry) => ({
        nodeType: entry.nodeType,
        refId: entry.refId,
        displayName: entry.displayName,
        treeIds: [...entry.treeIds],
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [placements],
  );

  // Candidate roster is shared, then filtered per tree and globally.
  const allCandidates = useMemo<TreeCandidate[]>(
    () => [...members.map(toMemberCandidate), ...contacts.map(toContactCandidate)],
    [members, contacts],
  );

  const candidates = useMemo(
    () => allCandidates.filter((candidate) => !placedKeys.has(refKey(candidate.nodeType, candidate.refId))),
    [allCandidates, placedKeys],
  );

  const unplacedAnywhere = useMemo(
    () => allCandidates.filter((candidate) => !globalPlacedKeys.has(refKey(candidate.nodeType, candidate.refId))),
    [allCandidates, globalPlacedKeys],
  );

  const overviewTotals = useMemo<OverviewTotals>(() => {
    let membersPlaced = 0;
    let contactsPlaced = 0;
    let deepest = 0;
    allNodes.forEach((node) => {
      if (node.nodeType === 'user') membersPlaced += 1;
      else contactsPlaced += 1;
    });
    overviewByTree.forEach((stats) => {
      deepest = Math.max(deepest, stats.maxDepth);
    });
    return {
      trees: trees.length,
      placed: allNodes.length,
      distinctPlaced: placements.size,
      members: membersPlaced,
      contacts: contactsPlaced,
      duplicates: duplicates.length,
      unplacedMembers: unplacedAnywhere.filter((candidate) => candidate.nodeType === 'user').length,
      unplacedContacts: unplacedAnywhere.filter((candidate) => candidate.nodeType === 'contact').length,
      deepest,
    };
  }, [trees.length, allNodes, placements, duplicates.length, unplacedAnywhere, overviewByTree]);

  const selectedTree = useMemo(
    () => trees.find((tree) => tree.id === selectedTreeId) ?? null,
    [trees, selectedTreeId],
  );

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  return {
    trees,
    selectedTree,
    selectedTreeId,
    setSelectedTreeId,
    nodes,
    nodeById,
    forest,
    candidates,
    overviewByTree,
    overviewTotals,
    duplicates,
    unplacedAnywhere,
    treesLoading,
    nodesLoading,
    nodesLoaded,
    error,
    setError,
  };
};
