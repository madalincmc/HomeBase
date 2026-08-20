import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { attachDatabasePool } from "@vercel/functions";
import * as schema from "./schema";

declare global {
  var _pgPool: Pool | undefined;
}

// Reuse the pool across Next.js dev-mode HMR reloads instead of opening a
// new one on every edit; attachDatabasePool keeps the Fluid Compute instance
// alive long enough for idle connections to drain on scale-down.
function createPool() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  attachDatabasePool(pool);
  return pool;
}

const pool = global._pgPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  global._pgPool = pool;
}

export const db = drizzle(pool, { schema });
