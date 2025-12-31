require('dotenv').config();
const { initialize, getDb } = require('../database');

// Add image_data BYTEA column to products table
async function addImageColumn() {
  try {
    console.log('🔄 Adding image storage columns to products table...');
    
    await initialize();
    const db = getDb();
    if (!db) {
      throw new Error('Database not initialized');
    }

    // Check if column already exists
    const checkStmt = await db.prepare(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'image_data'
    `);
    const exists = await checkStmt.get();

    if (exists) {
      console.log('✅ image_data column already exists');
    } else {
      // Add image_data column (BYTEA for binary data)
      await db.exec(`
        ALTER TABLE products 
        ADD COLUMN image_data BYTEA,
        ADD COLUMN image_mime_type VARCHAR(50) DEFAULT 'image/png'
      `);
      console.log('✅ Added image_data and image_mime_type columns');
    }

    // Create index on image_data for faster queries (only if column has data)
    try {
      await db.exec(`
        CREATE INDEX IF NOT EXISTS idx_products_has_image 
        ON products(id) WHERE image_data IS NOT NULL
      `);
      console.log('✅ Created index on image_data');
    } catch (e) {
      // Index might already exist, ignore
    }

    console.log('\n✅ Database schema updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addImageColumn();

