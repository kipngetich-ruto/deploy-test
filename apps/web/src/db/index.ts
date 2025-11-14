import 'dotenv/config';
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema'

const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: process.env.APP_ENV === "production" ? { rejectUnauthorized: false } : false,
})

const db = drizzle(pool, { schema })

export { db }