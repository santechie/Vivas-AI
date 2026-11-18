import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "vivas_ai",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Test connection
(async () => {
  try {
    const client = await pool.connect();
    console.log("✅ PostgreSQL Connected (vivas_ai)");
    client.release();
  } catch (err) {
    console.error("❌ PostgreSQL Connection Error:", err.message);
  }
})();

export const query = (text, params) => pool.query(text, params);
export default pool;
