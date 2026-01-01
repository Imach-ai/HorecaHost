const { initialize, pool } = require('../database');

async function addQuotationCurrencyVat() {
  console.log('🔄 Adding currency and vat_rate columns to quotations table...');
  
  await initialize();
  
  if (!pool) {
    throw new Error('Database connection failed');
  }

  try {
    // Check if columns exist
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'quotations' AND column_name IN ('currency', 'vat_rate')
    `);
    
    const existingColumns = checkResult.rows.map(row => row.column_name);
    
    // Add currency column if it doesn't exist
    if (!existingColumns.includes('currency')) {
      await pool.query(`
        ALTER TABLE quotations 
        ADD COLUMN currency VARCHAR(10) DEFAULT 'AED'
      `);
      console.log('✅ Added currency column');
    } else {
      console.log('✅ currency column already exists');
    }
    
    // Add vat_rate column if it doesn't exist
    if (!existingColumns.includes('vat_rate')) {
      await pool.query(`
        ALTER TABLE quotations 
        ADD COLUMN vat_rate NUMERIC(5, 2) DEFAULT 5
      `);
      console.log('✅ Added vat_rate column');
    } else {
      console.log('✅ vat_rate column already exists');
    }

    console.log('\n✅ Quotation currency and VAT columns setup completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addQuotationCurrencyVat();

