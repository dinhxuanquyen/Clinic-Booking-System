import 'dotenv/config';
import { MongoClient } from 'mongodb';

const DEFAULT_LOCAL_URI = 'mongodb://127.0.0.1:27017/clinic_central';
const MONGO_URI = process.env.SOURCE_MONGO_URI || process.env.MONGO_URI || DEFAULT_LOCAL_URI;
const BRANCH_DB_PREFIX = process.env.CLINIC_DB_PREFIX || 'clinic_branch';
const CONFIRM = process.env.CONFIRM_CLEANUP_BRANCHES;
const ALLOW_CLOUD = process.env.ALLOW_CLOUD_BRANCH_CLEANUP;

function getDatabaseName(uri, fallback = 'clinic_central') {
  try {
    const parsed = new URL(uri);
    const databaseName = parsed.pathname.replace(/^\//, '').trim();
    return databaseName || fallback;
  } catch {
    return fallback;
  }
}

function isCloudUri(uri) {
  return /^mongodb\+srv:/i.test(uri);
}

function getExpectedBranchNames(clinics) {
  const names = new Set();

  for (const clinic of clinics) {
    const clinicId = String(clinic._id);
    names.add(`${BRANCH_DB_PREFIX}_${clinicId}`);

    for (const field of ['databaseName', 'dbName', 'branchDbName', 'tenantDbName', 'branchDatabase']) {
      if (clinic[field]) {
        names.add(String(clinic[field]));
      }
    }
  }

  return names;
}

async function main() {
  if (isCloudUri(MONGO_URI) && ALLOW_CLOUD !== 'YES') {
    throw new Error(
      'Refusing to clean a cloud MongoDB URI. Set ALLOW_CLOUD_BRANCH_CLEANUP=YES only if you intentionally want to clean cloud branch databases.'
    );
  }

  const centralDbName = getDatabaseName(MONGO_URI);
  const client = new MongoClient(MONGO_URI);

  await client.connect();

  try {
    const centralDb = client.db(centralDbName);
    const clinics = await centralDb
      .collection('clinics')
      .find({}, { projection: { name: 1, databaseName: 1, dbName: 1, branchDbName: 1, tenantDbName: 1, branchDatabase: 1 } })
      .sort({ displayOrder: 1, createdAt: 1, name: 1 })
      .toArray();

    if (clinics.length === 0) {
      throw new Error(`No clinics found in ${centralDbName}. Refusing to clean branch databases.`);
    }

    const expectedBranchNames = getExpectedBranchNames(clinics);
    const { databases } = await client.db().admin().listDatabases();
    const branchDatabases = databases
      .map((database) => database.name)
      .filter((name) => name.startsWith(`${BRANCH_DB_PREFIX}_`))
      .sort();

    const keep = branchDatabases.filter((name) => expectedBranchNames.has(name));
    const unused = branchDatabases.filter((name) => !expectedBranchNames.has(name));

    console.log(`Mongo URI type: ${isCloudUri(MONGO_URI) ? 'cloud' : 'local'}`);
    console.log(`Central database: ${centralDbName}`);
    console.log(`Clinic count: ${clinics.length}`);
    console.log(`Branch databases found: ${branchDatabases.length}`);
    console.log(`Branch databases kept: ${keep.length}`);
    console.log(`Branch databases unused: ${unused.length}`);

    console.log('\nActive clinics and expected branch databases:');
    for (const clinic of clinics) {
      console.log(`- ${clinic.name}: ${BRANCH_DB_PREFIX}_${clinic._id}`);
    }

    if (unused.length > 0) {
      console.log('\nUnused branch databases:');
      for (const databaseName of unused) {
        console.log(`- ${databaseName}`);
      }
    } else {
      console.log('\nNo unused branch databases found.');
    }

    if (CONFIRM !== 'YES') {
      console.log('\nDry run only. Set CONFIRM_CLEANUP_BRANCHES=YES to drop unused branch databases.');
      return;
    }

    for (const databaseName of unused) {
      await client.db(databaseName).dropDatabase();
      console.log(`Dropped ${databaseName}`);
    }

    console.log('\nBranch database cleanup completed.');
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
