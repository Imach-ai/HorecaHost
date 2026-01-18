const { initialize, pool } = require('../database');

async function addQuotationDeliveryPayment() {
  console.log('🔄 Adding delivery and payment columns to quotations table...');
  
  await initialize();
  
  if (!pool) {
    throw new Error('Database connection failed');
  }

  try {
    // Check if columns exist
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'quotations' AND column_name IN ('delivery', 'payment')
    `);
    
    const existingColumns = checkResult.rows.map(row => row.column_name);
    
    // Add delivery column if it doesn't exist
    if (!existingColumns.includes('delivery')) {
      await pool.query(`
        ALTER TABLE quotations 
        ADD COLUMN delivery TEXT
      `);
      console.log('✅ Added delivery column');
    } else {
      console.log('✅ delivery column already exists');
    }
    
    // Add payment column if it doesn't exist
    if (!existingColumns.includes('payment')) {
      await pool.query(`
        ALTER TABLE quotations 
        ADD COLUMN payment TEXT
      `);
      console.log('✅ Added payment column');
    } else {
      console.log('✅ payment column already exists');
    }

    console.log('\n✅ Quotation delivery and payment columns setup completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addQuotationDeliveryPayment();

