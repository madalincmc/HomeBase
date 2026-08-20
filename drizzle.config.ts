import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations need a direct (non-pooled) connection — the pooled one
    // (DATABASE_URL) doesn't support the session-level operations drizzle-kit uses.
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
});
