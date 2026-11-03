import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { validateDatabaseUrl } from '../config/environment.js';
import { uuid, text } from '../common/domain/input.js';
config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
let pool: Pool | undefined;
try {
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test')
    throw new Error('Development/test only');
  const [action, id, reason, ...extra] = process.argv.slice(2);
  if ((action !== 'grant' && action !== 'revoke') || extra.length)
    throw new Error('Invalid arguments');
  const user = uuid(id),
    note = text(reason, 'reason', 2, 600);
  pool = new Pool({ connectionString: validateDatabaseUrl(process.env.DATABASE_URL), max: 1 });
  const tx = await pool.connect();
  try {
    await tx.query('BEGIN');
    await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
      'reviewer-permission:' + user,
    ]);
    const exists = await tx.query('SELECT id FROM app.users WHERE id=$1', [user]);
    if (!exists.rowCount) throw new Error('Unknown user');
    await tx.query(
      'INSERT INTO app.reviewer_permissions(user_id,active) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET active=EXCLUDED.active',
      [user, action === 'grant'],
    );
    await tx.query(
      'INSERT INTO app.reviewer_permission_history(user_id,active,reason) VALUES($1,$2,$3)',
      [user, action === 'grant', note],
    );
    await tx.query('COMMIT');
    process.stdout.write('Reviewer permission updated; history recorded.\n');
  } catch (e) {
    await tx.query('ROLLBACK');
    throw e;
  } finally {
    tx.release();
  }
} catch {
  process.stderr.write(
    'Permission update failed. Development/test only: grant|revoke existing-user-uuid "reason".\n',
  );
  process.exitCode = 1;
} finally {
  await pool?.end();
}
