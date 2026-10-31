import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { validateDatabaseUrl } from './src/config/environment.js';
import { appSchema } from './src/database/schema.js';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './drizzle',
  schemaFilter: [appSchema.schemaName],
  dbCredentials: { url: validateDatabaseUrl(process.env.DATABASE_URL) },
});
