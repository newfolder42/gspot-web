"use server";

import { Pool } from 'pg';
import { logerror, loginfo } from './logger';

const pool = new Pool({
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  port: 5432,
});

pool.on('connect', async () => {
  await loginfo('New database client connected to pool', {
    database: process.env.POSTGRES_DB,
    host: process.env.POSTGRES_HOST,
  });
});

pool.on('error', async (err) => {
  await logerror('Unexpected database pool error', {
    error: err.message,
    stack: err.stack,
    database: process.env.POSTGRES_DB,
    host: process.env.POSTGRES_HOST,
  });
});

pool.on('remove', async () => {
  await loginfo('Database client removed from pool');
});

export async function query(text: string, params?: any[]) {
  const startTime = Date.now();

  try {
    await loginfo('Database query started', {
      query: text.substring(0, 100),
      paramsCount: params?.length || 0,
    });

    const result = await pool.query(text, params);
    const duration = Date.now() - startTime;

    await loginfo('Database query completed', {
      duration,
      rowCount: result.rowCount,
    });

    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;

    await logerror('Database query failed', {
      error: error.message,
      code: error.code,
      duration,
      query: text.substring(0, 100),
      stack: error.stack,
    });

    throw error;
  }
}