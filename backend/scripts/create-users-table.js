const { initialize, pool } = require('../database');
const bcrypt = require('bcryptjs');

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
      // Default credentials: username: admin, password: Admin@123
      const defaultPassword = 'Admin@123';
      const passwordHash = await bcrypt.hash(defaultPassword, 10);

      await pool.query(
        `INSERT INTO users (username, password_hash, role, active)
         VALUES ($1, $2, 'admin', true)`,
        ['admin', passwordHash]
      );
      console.log('✅ Default admin user created');
      console.log('   Username: admin');
      console.log('   Password: Admin@123');
      console.log('   ⚠️  Please change the default password after first login!');
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

