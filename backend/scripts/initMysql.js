// Creates the MySQL database from sql/schema.sql and loads sql/seed.sql.
// WARNING: drops and recreates the predictive_maintenance database.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import 'dotenv/config';

const sqlDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'sql');

const conn = await mysql.createConnection({
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  multipleStatements: true,
});

try {
  for (const file of ['schema.sql', 'seed.sql']) {
    const sql = await fs.readFile(path.join(sqlDir, file), 'utf8');
    await conn.query(sql);
    console.log(`Executed ${file}`);
  }
  console.log('MySQL database ready.');
} finally {
  await conn.end();
}
