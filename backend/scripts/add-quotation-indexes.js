require('dotenv').config();
const { initialize, getDb } = require('../database');

// Add indexes to optimize quotation queries
async function addIndexes() {
  try {
    console.log('🔄 Adding indexes to optimize quotation queries...');
    
    await initialize();
    const db = getDb();
    if (!db) {
      throw new Error('Database not initialized');
    }

    const indexes = [
      // Quotations table indexes
      {
        name: 'idx_quotations_created_at',
        sql: 'CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON quotations(created_at DESC)'
      },
      {
        name: 'idx_quotations_status',
        sql: 'CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status)'
      },
      {
        name: 'idx_quotations_customer_name',
        sql: 'CREATE INDEX IF NOT EXISTS idx_quotations_customer_name ON quotations(customer_name)'
      },
      {
        name: 'idx_quotations_quotation_number',
        sql: 'CREATE INDEX IF NOT EXISTS idx_quotations_quotation_number ON quotations(quotation_number)'
      },
      {
        name: 'idx_quotations_date',
        sql: 'CREATE INDEX IF NOT EXISTS idx_quotations_date ON quotations(date DESC)'
      },
      // Composite index for common filter combinations
      {
        name: 'idx_quotations_status_created',
        sql: 'CREATE INDEX IF NOT EXISTS idx_quotations_status_created ON quotations(status, created_at DESC)'
      },
      // Quotation items indexes
      {
        name: 'idx_quotation_items_quotation_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id)'
      },
      {
        name: 'idx_quotation_items_product_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_quotation_items_product_id ON quotation_items(product_id)'
      },
      // Products table indexes (for faster product lookups)
      {
        name: 'idx_products_active',
        sql: 'CREATE INDEX IF NOT EXISTS idx_products_active ON products(active) WHERE active = true'
      },
      {
        name: 'idx_products_name_en',
        sql: 'CREATE INDEX IF NOT EXISTS idx_products_name_en ON products(name_en)'
      },
      {
        name: 'idx_products_slug',
        sql: 'CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug)'
      }
    ];

    for (const index of indexes) {
      try {
        await db.exec(index.sql);
        console.log(`✅ Created index: ${index.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⏭️  Index already exists: ${index.name}`);
        } else {
          console.error(`❌ Error creating index ${index.name}:`, error.message);
        }
      }
    }

    console.log('\n✅ All indexes created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addIndexes();

