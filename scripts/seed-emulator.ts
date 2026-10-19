import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

// Initialize Admin SDK pointing to emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:4000';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

if (!getApps().length) {
  initializeApp({
    projectId: 'outreach-slot-availability', // Must match firebase.json singleProjectMode
  });
}

const db = getFirestore();

async function seed() {
  console.log('🌱 Seeding Firestore emulator...');

  // --- Sample Tree ---
  const treeRef = db.collection('discipleshipTrees').doc('demo-tree-1');
  await treeRef.set({
    name: 'CLC Discipleship 2026',
    description: 'Main discipleship tree for CLC outreach',
    createdByUid: 'demo-user-1',
    createdByName: 'Nathan (Demo)',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  console.log('✅ Created tree: demo-tree-1');

  // --- Sample Nodes (3-level tree) ---
  const nodes = [
    // Root level
    {
      id: 'demo-tree-1__u_root-1',
      treeId: 'demo-tree-1',
      nodeType: 'user' as const,
      refId: 'root-1',
      displayName: 'Pastor John',
      photoUrl: null,
      parentId: null,
      path: ['demo-tree-1__u_root-1'],
      depth: 0,
      childOrder: 1,
      gospelStatus: 'baptized',
      membershipStatus: 'member',
      addedByUid: 'demo-user-1',
      addedByName: 'Nathan (Demo)',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    // Level 1 - Children of Pastor John
    {
      id: 'demo-tree-1__u_child-1',
      treeId: 'demo-tree-1',
      nodeType: 'user' as const,
      refId: 'child-1',
      displayName: 'Sarah Mitchell',
      photoUrl: null,
      parentId: 'demo-tree-1__u_root-1',
      path: ['demo-tree-1__u_root-1', 'demo-tree-1__u_child-1'],
      depth: 1,
      childOrder: 1,
      gospelStatus: 'baptized',
      membershipStatus: 'member',
      addedByUid: 'demo-user-1',
      addedByName: 'Nathan (Demo)',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    {
      id: 'demo-tree-1__c_contact-1',
      treeId: 'demo-tree-1',
      nodeType: 'contact' as const,
      refId: 'contact-1',
      displayName: 'Mike Thompson',
      photoUrl: null,
      parentId: 'demo-tree-1__u_root-1',
      path: ['demo-tree-1__u_root-1', 'demo-tree-1__c_contact-1'],
      depth: 1,
      childOrder: 2,
      gospelStatus: 'seeking',
      membershipStatus: null,
      addedByUid: 'demo-user-1',
      addedByName: 'Nathan (Demo)',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    // Level 2 - Grandchildren
    {
      id: 'demo-tree-1__u_grandchild-1',
      treeId: 'demo-tree-1',
      nodeType: 'user' as const,
      refId: 'grandchild-1',
      displayName: 'Emma Wilson',
      photoUrl: null,
      parentId: 'demo-tree-1__u_child-1',
      path: ['demo-tree-1__u_root-1', 'demo-tree-1__u_child-1', 'demo-tree-1__u_grandchild-1'],
      depth: 2,
      childOrder: 1,
      gospelStatus: 'baptized',
      membershipStatus: 'member',
      addedByUid: 'demo-user-1',
      addedByName: 'Nathan (Demo)',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    {
      id: 'demo-tree-1__u_grandchild-2',
      treeId: 'demo-tree-1',
      nodeType: 'user' as const,
      refId: 'grandchild-2',
      displayName: 'David Chen',
      photoUrl: null,
      parentId: 'demo-tree-1__u_child-1',
      path: ['demo-tree-1__u_root-1', 'demo-tree-1__u_child-1', 'demo-tree-1__u_grandchild-2'],
      depth: 2,
      childOrder: 2,
      gospelStatus: 'baptized',
      membershipStatus: 'member',
      addedByUid: 'demo-user-1',
      addedByName: 'Nathan (Demo)',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    // Another root (for testing multiple roots)
    {
      id: 'demo-tree-1__u_root-2',
      treeId: 'demo-tree-1',
      nodeType: 'user' as const,
      refId: 'root-2',
      displayName: 'Elder Mary',
      photoUrl: null,
      parentId: null,
      path: ['demo-tree-1__u_root-2'],
      depth: 0,
      childOrder: 2,
      gospelStatus: 'baptized',
      membershipStatus: 'member',
      addedByUid: 'demo-user-1',
      addedByName: 'Nathan (Demo)',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
  ];

  const batch = db.batch();
  nodes.forEach((node) => {
    batch.set(db.collection('discipleshipNodes').doc(node.id), node);
  });
  await batch.commit();
  console.log(`✅ Created ${nodes.length} nodes`);

  console.log('🎉 Seeding complete! Open http://localhost:4000 to view data.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});