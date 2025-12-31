const { Client } = require('pg');

// Neon DB connection string
const connectionString = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_PAzsW7twcy9Y@ep-morning-cloud-ahuxkfoj-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 15000,
});

async function testConnection() {
  console.log('🔍 Testing Neon DB connection...\n');
  console.log('Connection String:', connectionString.replace(/:[^:@]+@/, ':****@'));
  console.log('');

  try {
    console.log('⏳ Attempting to connect...');
    await client.connect();
    console.log('✅ Connection successful!\n');

    // Test query - get current time
    console.log('📊 Testing query execution...');
    const timeResult = await client.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ Query executed successfully');
    console.log('   Current database time:', timeResult.rows[0].current_time);
    console.log('   PostgreSQL version:', timeResult.rows[0].version.split(' ')[0] + ' ' + timeResult.rows[0].version.split(' ')[1]);
    console.log('');

    // Check existing tables
    console.log('📋 Checking existing tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('   ⚠️  No tables found in database');
    } else {
      console.log(`   ✅ Found ${tablesResult.rows.length} table(s):`);
      tablesResult.rows.forEach(row => {
        console.log(`      - ${row.table_name}`);
      });
    }
    console.log('');

    // Check if required tables exist
    const requiredTables = ['products', 'brands', 'categories', 'subcategories', 'quotations', 'quotation_items', 'settings'];
    const existingTableNames = tablesResult.rows.map(r => r.table_name);
    const missingTables = requiredTables.filter(t => !existingTableNames.includes(t));
    
    if (missingTables.length > 0) {
      console.log('⚠️  Missing tables (will be created on server start):');
      missingTables.forEach(t => console.log(`      - ${t}`));
    } else {
      console.log('✅ All required tables exist');
    }
    console.log('');

    // Test a simple query on products table if it exists
    if (existingTableNames.includes('products')) {
      console.log('📦 Testing products table...');
      const productsCount = await client.query('SELECT COUNT(*) as count FROM products');
      console.log(`   ✅ Products table accessible`);
      console.log(`   📊 Total products: ${productsCount.rows[0].count}`);
    }

    await client.end();
    console.log('\n✅ All tests passed! Database connection is working correctly.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    
    if (error.code === 'ENOTFOUND') {
      console.error('\n💡 DNS resolution failed. Check your internet connection.');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.error('\n💡 Connection timeout/refused. Check:');
      console.error('   - Neon DB database is active');
      console.error('   - Firewall settings');
    } else if (error.code === '28P01') {
      console.error('\n💡 Authentication failed. Check:');
      console.error('   - Username and password are correct');
    }
    
    await client.end();
    process.exit(1);
  }
}

testConnection();
