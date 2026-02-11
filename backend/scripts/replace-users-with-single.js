#!/usr/bin/env node
/**
 * Backup `users` table to backend/users-backup-<timestamp>.json,
 * then remove all users and create a single admin user.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." node backend/scripts/replace-users-with-single.js <username> "<password>"
 *
 * Warning: This will DELETE all users. Use with care.
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('ERROR: DATABASE_URL must be set in environment.');
    process.exit(1);
  }
  const username = process.argv[2];
  const password = process.argv[3];
  if (!username || !password) {
    console.error('Usage: node replace-users-with-single.js <username> "<password>"');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    // Backup users
    const res = await pool.query('SELECT * FROM users ORDER BY id');
    const rows = res.rows || [];
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '..');
    const backupPath = path.join(backupDir, `users-backup-${ts}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(rows, null, 2), { encoding: 'utf8' });
    console.log('✅ Backed up', rows.length, 'users to', backupPath);

    // Delete all users
    await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
    console.log('✅ Deleted all users (table truncated).');

    // Insert single user
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (username, password_hash, role, active, created_at, updated_at) VALUES ($1,$2,$3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [username, hash, 'admin', true]
    );
    console.log(`✅ Created user '${username}'.`);

    console.log('All done. Keep the backup file safe and rotate credentials if needed.');
  } catch (err) {
    console.error('ERROR:', err && err.message ? err.message : err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

