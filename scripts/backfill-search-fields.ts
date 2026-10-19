import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldPath, getFirestore } from 'firebase-admin/firestore';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { buildContactSearchTerms } from '../src/utils/contactSearch.js';

/**
 * Backfills the normalized name fields used by AddPersonModal's Firestore
 * prefix search:
 *
 *   users_public/{uid}.displayNameLower  <- displayName
 *   contacts/{id}.nameLower              <- name
 *
 * Run once after deploying the schema change. Existing documents without these
 * fields will not appear in search results until they are backfilled (new or
 * edited profiles/contacts write them automatically).
 *
 * Production with your existing gcloud login (no service account key needed):
 *   gcloud auth application-default login
 *   npx tsx scripts/backfill-search-fields.ts
 *
 * Or with a service account key:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json \
 *     npx tsx scripts/backfill-search-fields.ts
 *
 * Emulator (with firebase emulators:start running):
 *   FIRESTORE_EMULATOR_HOST=localhost:4000 \
 *     npx tsx scripts/backfill-search-fields.ts
 */

const PROJECT_ID = 'outreach-slot-availability';
const SERVICE_ACCOUNT_PATH = './service-account-key.json';
const PAGE_SIZE = 400;
const useEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const resolveCredential = () => {
  if (existsSync(SERVICE_ACCOUNT_PATH)) {
    return cert(resolve(SERVICE_ACCOUNT_PATH));
  }

  try {
    return applicationDefault();
  } catch {
    console.error(
      'No Google Cloud credentials found.\n' +
        'Run `gcloud auth application-default login` (recommended), or set\n' +
        'GOOGLE_APPLICATION_CREDENTIALS to a service account key file.',
    );
    process.exit(1);
  }
};

if (!getApps().length) {
  initializeApp(
    useEmulator
      ? { projectId: PROJECT_ID }
      : { credential: resolveCredential(), projectId: PROJECT_ID },
  );
}

const db = getFirestore();

const normalize = (value: unknown): string | null =>
  typeof value === 'string' ? value.trim().toLowerCase() : null;

async function backfill(
  collectionName: string,
  sourceField: string,
  targetField: string,
): Promise<void> {
  let scanned = 0;
  let updated = 0;
  let last: QueryDocumentSnapshot | null = null;

  for (;;) {
    let pageQuery = db
      .collection(collectionName)
      .orderBy(FieldPath.documentId())
      .limit(PAGE_SIZE);

    if (last) pageQuery = pageQuery.startAfter(last);

    const snapshot = await pageQuery.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    let writes = 0;

    for (const document of snapshot.docs) {
      const name = normalize(document.get(sourceField));
      if (!name || document.get(targetField) === name) continue;

      batch.set(document.ref, { [targetField]: name }, { merge: true });
      writes += 1;
      updated += 1;
    }

    if (writes > 0) await batch.commit();

    scanned += snapshot.size;
    last = snapshot.docs[snapshot.docs.length - 1];

    if (snapshot.size < PAGE_SIZE) break;
  }

  console.log(`${collectionName}: scanned ${scanned}, updated ${updated}.`);
}

async function backfillContactSearchTerms(): Promise<void> {
  let scanned = 0;
  let updated = 0;
  let last: QueryDocumentSnapshot | null = null;

  for (;;) {
    let pageQuery = db
      .collection('contacts')
      .orderBy(FieldPath.documentId())
      .limit(PAGE_SIZE);

    if (last) pageQuery = pageQuery.startAfter(last);

    const snapshot = await pageQuery.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    let writes = 0;

    for (const document of snapshot.docs) {
      const data = document.data();
      const terms = buildContactSearchTerms({
        name: typeof data.name === 'string' ? data.name : '',
        phoneNumber: typeof data.phoneNumber === 'string' ? data.phoneNumber : null,
        createdByName: typeof data.createdByName === 'string' ? data.createdByName : null,
        responseStatuses: Array.isArray(data.responseStatuses) ? data.responseStatuses : [],
        gospelStatus: typeof data.gospelStatus === 'string' ? data.gospelStatus : null,
        contactDate: typeof data.contactDate === 'string' ? data.contactDate : null,
        createdAt: data.createdAt,
      });

      if (terms.length === 0) continue;

      const existing = document.get('searchTerms');
      const unchanged = Array.isArray(existing)
        && existing.length === terms.length
        && existing.every((term, index) => term === terms[index]);
      if (unchanged) continue;

      batch.set(document.ref, { searchTerms: terms }, { merge: true });
      writes += 1;
      updated += 1;
    }

    if (writes > 0) await batch.commit();

    scanned += snapshot.size;
    last = snapshot.docs[snapshot.docs.length - 1];

    if (snapshot.size < PAGE_SIZE) break;
  }

  console.log(`contacts.searchTerms: scanned ${scanned}, updated ${updated}.`);
}

async function run(): Promise<void> {
  console.log(useEmulator ? 'Backfilling the Firestore emulator...' : 'Backfilling production Firestore...');
  await backfill('users_public', 'displayName', 'displayNameLower');
  await backfill('contacts', 'name', 'nameLower');
  await backfillContactSearchTerms();
  console.log('Backfill complete.');
}

run().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
