import 'dotenv/config';
import { MongoClient } from 'mongodb';

const DEFAULT_SOURCE_URI = 'mongodb://127.0.0.1:27017/clinic_central';
const SOURCE_URI = process.env.SOURCE_MONGO_URI || DEFAULT_SOURCE_URI;
const TARGET_URI = process.env.TARGET_MONGO_URI || process.env.CLOUD_MONGO_URI;
const CONFIRM = process.env.CONFIRM_SYNC_TO_CLOUD;
const BRANCH_DB_PREFIX = process.env.CLINIC_DB_PREFIX || 'clinic_branch';

function getDatabaseName(uri, fallback = 'clinic_central') {
  try {
    const parsed = new URL(uri);
    const databaseName = parsed.pathname.replace(/^\//, '').trim();
    return databaseName || fallback;
  } catch {
    return fallback;
  }
}

function sanitizeIndex(index) {
  const allowedKeys = [
    'key',
    'name',
    'unique',
    'sparse',
    'expireAfterSeconds',
    'partialFilterExpression',
    'collation',
    'background'
  ];

  return Object.fromEntries(Object.entries(index).filter(([key]) => allowedKeys.includes(key)));
}

function sanitizeCollectionOptions(options = {}) {
  const allowedKeys = [
    'capped',
    'size',
    'max',
    'validator',
    'validationLevel',
    'validationAction',
    'collation'
  ];

  return Object.fromEntries(Object.entries(options).filter(([key]) => allowedKeys.includes(key)));
}

async function getDatabasesToSync(sourceClient, centralDbName) {
  const { databases } = await sourceClient.db().admin().listDatabases();
  return databases
    .map((database) => database.name)
    .filter((name) => name === centralDbName || name.startsWith(`${BRANCH_DB_PREFIX}_`))
    .sort((a, b) => (a === centralDbName ? -1 : b === centralDbName ? 1 : a.localeCompare(b)));
}

async function copyCollection(sourceDb, targetDb, collectionInfo) {
  const collectionName = collectionInfo.name;
  const sourceCollection = sourceDb.collection(collectionName);
  const targetCollection = targetDb.collection(collectionName);
  const options = sanitizeCollectionOptions(collectionInfo.options);

  await targetDb.createCollection(collectionName, options).catch((error) => {
    if (error?.codeName !== 'NamespaceExists') {
      throw error;
    }
  });

  const documents = await sourceCollection.find({}).toArray();
  if (documents.length > 0) {
    await targetCollection.insertMany(documents, { ordered: false });
  }

  const indexes = (await sourceCollection.indexes())
    .filter((index) => index.name !== '_id_')
    .map(sanitizeIndex);

  if (indexes.length > 0) {
    await targetCollection.createIndexes(indexes);
  }

  return documents.length;
}

async function copyDatabase(sourceClient, targetClient, databaseName) {
  const sourceDb = sourceClient.db(databaseName);
  const targetDb = targetClient.db(databaseName);
  const collections = await sourceDb.listCollections({}, { nameOnly: false }).toArray();

  await targetDb.dropDatabase();

  let documentCount = 0;
  for (const collectionInfo of collections) {
    documentCount += await copyCollection(sourceDb, targetDb, collectionInfo);
  }

  return { collections: collections.length, documents: documentCount };
}

async function main() {
  if (!TARGET_URI) {
    throw new Error('Missing TARGET_MONGO_URI or CLOUD_MONGO_URI. Please provide the cloud MongoDB URI.');
  }

  if (CONFIRM !== 'YES') {
    throw new Error('Refusing to sync. Set CONFIRM_SYNC_TO_CLOUD=YES to overwrite cloud data from local.');
  }

  const sourceCentralDbName = getDatabaseName(SOURCE_URI);
  const targetCentralDbName = getDatabaseName(TARGET_URI, sourceCentralDbName);

  if (sourceCentralDbName !== targetCentralDbName) {
    throw new Error(
      `Source database "${sourceCentralDbName}" and target database "${targetCentralDbName}" do not match.`
    );
  }

  const sourceClient = new MongoClient(SOURCE_URI);
  const targetClient = new MongoClient(TARGET_URI);

  await sourceClient.connect();
  await targetClient.connect();

  try {
    const databasesToSync = await getDatabasesToSync(sourceClient, sourceCentralDbName);
    if (databasesToSync.length === 0) {
      throw new Error('No local clinic databases found to sync.');
    }

    console.log(`Syncing ${databasesToSync.length} database(s) from local to cloud...`);
    for (const databaseName of databasesToSync) {
      const result = await copyDatabase(sourceClient, targetClient, databaseName);
      console.log(
        `Synced ${databaseName}: ${result.collections} collection(s), ${result.documents} document(s)`
      );
    }
    console.log('Local to cloud sync completed.');
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
