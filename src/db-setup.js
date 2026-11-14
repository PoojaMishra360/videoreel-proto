import { closeDatabase, connectToDatabase } from "./db.js";

const indexes = {
  users: [
    [{ email: 1 }, { unique: true, name: "users_email_unique" }],
  ],
  sessions: [
    [{ expiresAt: 1 }, { expireAfterSeconds: 0, name: "sessions_expiry_ttl" }],
  ],
  workspaces: [
    [{ ownerUserId: 1 }, { unique: true, name: "workspaces_owner_unique" }],
  ],
  projects: [
    [{ userId: 1, updatedAt: -1 }, { name: "projects_user_updated" }],
    [{ userId: 1, status: 1 }, { name: "projects_user_status" }],
  ],
  project_versions: [
    [{ userId: 1, projectId: 1, version: 1 }, { unique: true, name: "project_versions_unique" }],
  ],
  scenes: [
    [{ projectId: 1, order: 1 }, { name: "scenes_project_order" }],
    [{ userId: 1, projectId: 1 }, { name: "scenes_user_project" }],
  ],
  assets: [
    [{ userId: 1, projectId: 1, type: 1 }, { name: "assets_user_project_type" }],
  ],
  generation_jobs: [
    [{ userId: 1, createdAt: -1 }, { name: "jobs_user_created" }],
    [{ status: 1, createdAt: 1 }, { name: "jobs_status_created" }],
    [{ idempotencyKey: 1 }, { unique: true, sparse: true, name: "jobs_idempotency_unique" }],
  ],
  renders: [
    [{ userId: 1, projectId: 1, createdAt: -1 }, { name: "renders_user_project_created" }],
  ],
  connected_accounts: [
    [{ userId: 1, provider: 1 }, { unique: true, name: "connected_accounts_user_provider_unique" }],
    [{ igUserId: 1 }, { unique: true, sparse: true, name: "connected_accounts_ig_user_unique" }],
    [{ tokenExpiresAt: 1 }, { name: "connected_accounts_token_expiry" }],
  ],
  scheduled_posts: [
    [{ status: 1, scheduledAt: 1 }, { name: "scheduled_posts_status_time" }],
    [{ userId: 1, scheduledAt: -1 }, { name: "scheduled_posts_user_time" }],
  ],
  credit_ledger: [
    [{ userId: 1, createdAt: -1 }, { name: "credit_ledger_user_created" }],
  ],
  subscriptions: [
    [{ userId: 1, status: 1 }, { name: "subscriptions_user_status" }],
  ],
  brand_kits: [
    [{ userId: 1 }, { unique: true, name: "brand_kits_user_unique" }],
  ],
  notifications: [
    [{ userId: 1, createdAt: -1 }, { name: "notifications_user_created" }],
  ],
  audit_logs: [
    [{ userId: 1, createdAt: -1 }, { name: "audit_logs_user_created" }],
    [{ createdAt: 1 }, { expireAfterSeconds: 31536000, name: "audit_logs_ttl_1y" }],
  ],
};

async function ensureCollection(db, name) {
  try {
    await db.createCollection(name);
  } catch (error) {
    if (error?.code !== 48 && error?.codeName !== "NamespaceExists") throw error;
  }
}

async function setup() {
  const db = await connectToDatabase();
  for (const [collectionName, collectionIndexes] of Object.entries(indexes)) {
    await ensureCollection(db, collectionName);
    if (collectionIndexes.length) {
      await db.collection(collectionName).createIndexes(
        collectionIndexes.map(([key, options]) => ({ key, ...options })),
      );
    }
  }

  console.log(`MongoDB setup complete for database "${db.databaseName}".`);
  console.log(`Ensured ${Object.keys(indexes).length} collections and their indexes.`);
}

try {
  await setup();
} catch (error) {
  console.error(error instanceof Error ? error.message : "MongoDB setup failed.");
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
