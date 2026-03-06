// src/lib/server/db.js
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

// This creates the connection pool using your .env variable
const sql = postgres(env.DATABASE_URL || '');

if (!env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    throw new Error('DATABASE_URL is not set');
}

console.log("SQL:", sql);
export default sql;