import { Pool } from "pg";
import { readFileSync } from "fs";
import path from "path";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://cabinet@127.0.0.1:5433/cabinet",
});

export async function migrate(): Promise<void> {
  const sql = readFileSync(path.join(process.cwd(), "sql", "001_init.sql"), "utf8");
  await pool.query(sql);
}

export async function waitForDatabase(): Promise<void> {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      if (attempt === 30) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}
