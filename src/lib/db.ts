"use server";

import { Pool } from 'pg';

const pool = new Pool({
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  port: 5432,
});

export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}