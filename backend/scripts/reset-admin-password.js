#!/usr/bin/env node
/**
 * Reset admin password script
 * Usage:
 *   DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require" node backend/scripts/reset-admin-password.js admin "NewP@ssw0rd!"
 *
 * The script updates the password_hash for the given username (default: admin).
 * IMPORTANT: Run this locally or in a secure environment. Do not commit the password.
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('ERROR: DATABASE_URL environment variable is not set.');
    process.exit(1);
  }

  const username = process.argv[2] || 'admin';
  const newPass = process.argv[3];
  if (!newPass) {
    console.error('Usage: node backend/scripts/reset-admin-password.js <username> "<new-password>"');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const hash = await bcrypt.hash(newPass, 10);
    const res = await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, username]);
    if (res.rowCount === 0) {
      console.warn(`No user found with username='${username}'. Consider creating the user using create-users-table.js or insert manually.`);
    } else {
      console.log(`✅ Password updated for user '${username}'.`);
    }
  } catch (err) {
    console.error('Error updating password:', err.message || err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

