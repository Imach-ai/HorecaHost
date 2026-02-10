const { initialize, pool } = require('../database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function createUsersTable() {
  console.log('🔄 Creating users table...');

  await initialize(); // Ensure DB is initialized

  if (!pool) {
    throw new Error('Database connection failed');
  }

  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) DEFAULT 'admin' NOT NULL,
        active BOOLEAN DEFAULT true NOT NULL,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');

    // Create index on username for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)
    `);
    console.log('✅ Index on username created');

    // Check if admin user exists
    const checkResult = await pool.query('SELECT id FROM users WHERE username = $1', ['admin']);
    const existingAdmin = checkResult.rows[0];

    if (!existingAdmin) {
      // Create default admin user
      // Priority: use ADMIN_PASSWORD env var (if set and >=12 chars), otherwise generate a strong random password.
      function generateStrongPassword(length = 16) {
        const lower = 'abcdefghijklmnopqrstuvwxyz';
        const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const digits = '0123456789';
        const symbols = '!@#$%^&*()-_=+[]{}<>?';
        const all = lower + upper + digits + symbols;
        let pwd = '';
        // Ensure at least one from each class
        pwd += lower[Math.floor(Math.random() * lower.length)];
        pwd += upper[Math.floor(Math.random() * upper.length)];
        pwd += digits[Math.floor(Math.random() * digits.length)];
        pwd += symbols[Math.floor(Math.random() * symbols.length)];
        for (let i = pwd.length; i < length; i++) {
          pwd += all[Math.floor(Math.random() * all.length)];
        }
        // Shuffle
        return pwd.split('').sort(() => 0.5 - Math.random()).join('');
      }

      const envPassword = process.env.ADMIN_PASSWORD;
      let defaultPassword;
      if (envPassword && envPassword.length >= 12) {
        defaultPassword = envPassword;
      } else {
        defaultPassword = generateStrongPassword(16);
      }

      const passwordHash = await bcrypt.hash(defaultPassword, 10);

      await pool.query(
        `INSERT INTO users (username, password_hash, role, active)
         VALUES ($1, $2, 'admin', true)`,
        ['admin', passwordHash]
      );
      console.log('✅ Default admin user created');
      console.log('   Username: admin');
      // IMPORTANT: we print the generated password once for the operator to save securely.
      console.log('   Generated admin password (save this now):', defaultPassword);
      console.log('   ⚠️  Please change the password immediately after first login and do NOT commit it.');
    } else {
      console.log('✅ Admin user already exists');
    }

    console.log('\n✅ Users table setup completed!');
  } catch (error) {
    console.error('❌ Error setting up users table:', error);
    throw error;
  }
}

createUsersTable().catch(err => {
  console.error('Fatal error during users table setup:', err);
  process.exit(1);
});

