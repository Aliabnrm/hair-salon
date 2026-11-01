import { pgSchema } from 'drizzle-orm/pg-core';

// Shared application namespace; tenant isolation belongs to future business keys.
export const appSchema = pgSchema('app');
