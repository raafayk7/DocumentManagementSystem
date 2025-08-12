import { defineConfig } from "drizzle-kit";
import * as dotenv from 'dotenv';
dotenv.config();
export default defineConfig({
    out: "./drizzle",
    schema: './src/db/schema.ts',
    dialect: "postgresql",
    dbCredentials: {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: String(process.env.DB_SSL).toLowerCase() === 'true'
    },
});
