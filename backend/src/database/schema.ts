export { appSchema } from './app-schema.js';
export {
  users,
  passwordCredentials,
  sessions,
  authAttemptBuckets,
} from '../modules/identity/infrastructure/persistence/identity.schema.js';

export * from '../modules/salon-management/infrastructure/persistence/management.schema.js';
