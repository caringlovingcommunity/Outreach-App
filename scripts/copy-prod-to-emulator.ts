import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Copies Firestore data from PRODUCTION to LOCAL EMULATOR.
 * Run this ONCE to populate emulator with real data.
 * 
 * Prerequisites:
 * 1. firebase emulators:start (running in another terminal)
 * 2. Service account key with Firestore read permission
 *    - Firebase Console > Project Settings > Service Accounts > Generate Private Key
 *    - Save as ./service-account-key.json (gitignored)
 */

// CONFIG - Update these
const PROD_PROJECT_ID = 'outreach-slot-availability';
const SERVICE_ACCOUNT_PATH = './service-account-key.json'; // Download from Firebase Console
const COLLECTIONS_TO_COPY = ['discipleshipTrees', 'discipleshipNodes'];

async function copyProdToEmulator() {
  console.log('🔄 Copying production data to emulator...\n');

  // 1. Initialize PROD app (with service account)
  if (!getApps().some(a => a.name === 'prod')) {
    initializeApp({
      credential: cert(SERVICE_ACCOUNT_PATH),
      projectId: PROD_PROJECT_ID,
    }, 'prod');
  }
  const prodDb = getFirestore(getApps().find(a => a.name === 'prod')!);

  // 2. Initialize EMULATOR app
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:4000';
  if (!getApps().some(a => a.name === 'emulator')) {
    initializeApp({ projectId: PROD_PROJECT_ID }, 'emulator');
  }
  const emuDb = getFirestore(getApps().find(a => a.name === 'emulator')!);

  // 3. Copy each collection
  for (const collName of COLLECTIONS_TO_COPY) {
    console.log(`📦 Copying ${collName}...`);
    
    const snapshot = await prodDb.collection(collName).get();
    console.log(`   Found ${snapshot.docs.length} documents`);

    if (snapshot.empty) {
      console.log(`   ⚠️  No documents in ${collName}`);
      continue;
    }

    // Batch write to emulator (500 ops per batch)
    const batchSize = 500;
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = emuDb.batch();
      const chunk = snapshot.docs.slice(i, i + batchSize);
      
      chunk.forEach(doc => {
        batch.set(emuDb.collection(collName).doc(doc.id), doc.data());
      });
      
      await batch.commit();
      console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1} written (${chunk.length} docs)`);
    }
  }

  console.log('\n🎉 Copy complete! Check http://localhost:4000');
  process.exit(0);
}

copyProdToEmulator().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});