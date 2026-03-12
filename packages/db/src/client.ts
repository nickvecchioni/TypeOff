import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export function createDb(databaseUrl: string) {
  const sql = postgres(databaseUrl, { prepare: false });
  return drizzle(sql, { schema });
}

export type Database = ReturnType<typeof createDb>;
