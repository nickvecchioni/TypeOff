import { createDb, type Database } from "@typeoff/db";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";
import * as schema from "@typeoff/db";
import ws from "ws";

let _db: Database | null = null;

export function getDb(): Database {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _db = createDb(url);
  }
  return _db;
}

let _poolDb: ReturnType<typeof drizzlePool> | null = null;

export function getPoolDb() {
  if (!_poolDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString: url });
    _poolDb = drizzlePool(pool, { schema });
  }
  return _poolDb;
}

export type PoolDatabase = ReturnType<typeof getPoolDb>;
