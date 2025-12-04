"use server";

import { Pool } from 'pg';
import { logerror } from './logger';

const pool = new Pool({
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  port: 5432,
  ...(process.env.POSTGRES_SSL !== 'false' && {
    ssl: {
      rejectUnauthorized: false
    }
  })
});

pool.on('error', async (err) => {
  await logerror('Unexpected database pool error', {
    error: err.message,
    stack: err.stack,
    database: process.env.POSTGRES_DB,
    host: process.env.POSTGRES_HOST,
  });
});

export async function query(text: string, params?: any[]) {
  const startTime = Date.now();

  try {
    return await pool.query(text, params);
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