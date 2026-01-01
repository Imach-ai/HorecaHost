const { initialize, pool } = require('../database');

async function addBrandCountryColumns() {
  console.log('🔄 Adding country columns to brands table...');
  
  await initialize();
  
  if (!pool) {
    throw new Error('Database connection failed');
  }

  try {
    // Check if columns exist
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'brands' AND column_name IN ('country_en', 'country_ar', 'flag_image')
    `);
    
    const existingColumns = checkResult.rows.map(row => row.column_name);
    
    // Add country_en column if it doesn't exist
    if (!existingColumns.includes('country_en')) {
      await pool.query(`
        ALTER TABLE brands 
        ADD COLUMN country_en VARCHAR(255)
      `);
      console.log('✅ Added country_en column');
    } else {
      console.log('✅ country_en column already exists');
    }
    
    // Add country_ar column if it doesn't exist
    if (!existingColumns.includes('country_ar')) {
      await pool.query(`
        ALTER TABLE brands 
        ADD COLUMN country_ar VARCHAR(255)
      `);
      console.log('✅ Added country_ar column');
    } else {
      console.log('✅ country_ar column already exists');
    }
    
    // Add flag_image column if it doesn't exist (for storing flag image URL or path)
    if (!existingColumns.includes('flag_image')) {
      await pool.query(`
        ALTER TABLE brands 
        ADD COLUMN flag_image VARCHAR(500)
      `);
      console.log('✅ Added flag_image column');
    } else {
      console.log('✅ flag_image column already exists');
    }

    console.log('\n✅ Brand country columns setup completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addBrandCountryColumns();

