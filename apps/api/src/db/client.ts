import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema.ts";

export type AppDatabase = NodePgDatabase<typeof schema>;
