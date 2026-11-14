import "dotenv/config";
import { MongoClient } from "mongodb";

const databaseName = process.env.MONGODB_DB?.trim() || "videoreel";
let clientPromise;

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error("MONGODB_URI is not configured. Add your Atlas connection string to the local .env file.");
  }

  if (!clientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    });
    clientPromise = client.connect().catch(() => {
      clientPromise = undefined;
      throw new Error("Could not connect to MongoDB. Check the URI, database user, Atlas network access, and IP allowlist.");
    });
  }

  const client = await clientPromise;
  return client.db(databaseName);
}

export async function closeDatabase() {
  if (!clientPromise) return;
  const client = await clientPromise;
  clientPromise = undefined;
  await client.close();
}
