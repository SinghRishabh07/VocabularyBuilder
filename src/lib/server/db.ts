import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const DATABASE_URL = env.DATABASE_URL?.trim();

if (!DATABASE_URL) {
	const err = new Error(
		'DATABASE_URL is not set. Add it to your .env file or environment variables.'
	);
	console.error('[db]', err.message);
	throw err;
}

let sql: ReturnType<typeof postgres>;

try {
	sql = postgres(DATABASE_URL, {
		max: 10,
		idle_timeout: 20,
		connect_timeout: 10,
	});
} catch (err) {
	const message = err instanceof Error ? err.message : 'Unknown database error';
	console.error('[db] Failed to create connection pool:', message);
	throw new Error(`Database connection failed: ${message}`);
}

export default sql;