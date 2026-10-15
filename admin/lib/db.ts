import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

// Same connection settings as the main app (POSTGRES_* in .env.local). The pool is kept on
// globalThis so dev-server hot reloads reuse it instead of opening a new one per edit.
const globalForPool = globalThis as unknown as { gspotAdminPool?: Pool };

function createPool(): Pool {
  const pool = new Pool({
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    host: process.env.POSTGRES_HOST,
    port: 5432,
    ...(process.env.POSTGRES_SSL !== 'false' && {
      ssl: { rejectUnauthorized: false },
    }),
  });

  pool.on('error', (err) => {
    console.error('Unexpected database pool error', err.message);
  });

  return pool;
}

const pool = (globalForPool.gspotAdminPool ??= createPool());

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

// Runs `fn` in one transaction, rolling back on any throw. Creating an item uses it so the
// row only becomes visible once its icon has actually reached S3.
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
