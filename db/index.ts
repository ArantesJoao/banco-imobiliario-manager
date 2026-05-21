import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Lazy — avoid throwing at import time so `next build` can collect types
// without DATABASE_URL being set in the build environment.
const url = process.env.DATABASE_URL || "postgresql://placeholder/placeholder";
const sql = neon(url);
export const db = drizzle(sql, { schema });
export * as schema from "./schema";
