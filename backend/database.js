const { Pool } = require('pg');
const path = require('path');

// PostgreSQL connection configuration
// IMPORTANT: Do NOT hardcode production credentials here. Set DATABASE_URL as an environment variable.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('⚠️  DATABASE_URL is not set. Database connections will be unavailable until you set this environment variable.');
}

// Create connection pool only if we have a connection string
let pool;
if (connectionString) {
  pool = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false // Neon DB requires SSL
    },
    connectionTimeoutMillis: 15000, // 15 seconds timeout
    idleTimeoutMillis: 30000,
    max: 20, // Maximum number of clients in the pool
  });
} else {
  // Minimal stub to avoid crashes when pool is referenced in dev without DATABASE_URL.
  pool = {
    query: async () => { throw new Error('DATABASE_URL not configured'); },
    on: () => {},
  };
}

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database pool error:', err.message);
  // Don't exit process - allow retry
});

let db = null;

// Wrapper class to provide SQLite-like API for compatibility
class DatabaseWrapper {
  constructor(poolClient) {
    this.pool = poolClient;
  }

  async prepare(sqlQuery) {
    const self = this;
    // Convert SQLite syntax to PostgreSQL
    const pgSql = this.convertSQLiteToPostgreSQL(sqlQuery);
    
    return {
      async run(...params) {
        try {
          // pg package uses $1, $2, etc. for parameters
          let result;
          if (params && params.length > 0) {
            // Convert ? to $1, $2, etc.
            let paramIndex = 1;
            const paramSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
            result = await self.pool.query(paramSql, params);
          } else {
            result = await self.pool.query(pgSql);
          }
          
          // pg returns { rows, rowCount }, check if it has id property
          const returnedId = result.rows && result.rows.length > 0 ? result.rows[0]?.id : null;
          return {
            lastInsertRowid: returnedId || 0,
            changes: result.rowCount || 0,
            insertId: returnedId
          };
        } catch (error) {
          console.error('Database run error:', error);
          throw error;
        }
      },
      async get(...params) {
        try {
          let result;
          if (params && params.length > 0) {
            let paramIndex = 1;
            const paramSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
            result = await self.pool.query(paramSql, params);
          } else {
            result = await self.pool.query(pgSql);
          }
          return result.rows && result.rows.length > 0 ? result.rows[0] : undefined;
        } catch (error) {
          console.error('Database get error:', error);
          throw error;
        }
      },
      async all(...params) {
        try {
          let result;
          if (params && params.length > 0) {
            let paramIndex = 1;
            const paramSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
            result = await self.pool.query(paramSql, params);
          } else {
            result = await self.pool.query(pgSql);
          }
          return result.rows || [];
        } catch (error) {
          console.error('Database all error:', error);
          throw error;
        }
      }
    };
  }

  async exec(sqlQuery) {
    try {
      const pgSql = this.convertSQLiteToPostgreSQL(sqlQuery);
      await this.pool.query(pgSql);
    } catch (error) {
      console.error('Database exec error:', error);
      throw error;
    }
  }

  async pragma(sqlQuery) {
    // PostgreSQL doesn't use PRAGMA, but we'll handle foreign keys in schema
    // This is mainly for compatibility
    if (sqlQuery.includes('foreign_keys')) {
      // Foreign keys are enabled by default in PostgreSQL
      return;
    }
  }

  // Convert SQLite syntax to PostgreSQL
  convertSQLiteToPostgreSQL(sqlQuery) {
    let pgSql = sqlQuery;
    
    // Only replace ? if the SQL doesn't already use $ parameters
    if (!/\$\d+/.test(pgSql)) {
      // Replace ? with $1, $2, etc. for parameterized queries
      let paramIndex = 1;
      pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
    }
    
    // Replace INTEGER PRIMARY KEY AUTOINCREMENT with SERIAL PRIMARY KEY
    pgSql = pgSql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
    
    // Replace AUTOINCREMENT with SERIAL
    pgSql = pgSql.replace(/AUTOINCREMENT/gi, '');
    
    // Replace REAL with NUMERIC or DECIMAL
    pgSql = pgSql.replace(/\bREAL\b/gi, 'NUMERIC');
    
    // Replace DATETIME with TIMESTAMP
    pgSql = pgSql.replace(/\bDATETIME\b/gi, 'TIMESTAMP');
    
    // Replace INSERT OR IGNORE with INSERT ... ON CONFLICT DO NOTHING
    pgSql = pgSql.replace(/INSERT OR IGNORE INTO/gi, 'INSERT INTO');
    
    // Replace last_insert_rowid() with RETURNING id or lastval()
    pgSql = pgSql.replace(/last_insert_rowid\(\)/gi, 'lastval()');
    
    return pgSql;
  }

  // Direct query method for complex queries
  async query(sqlQuery, params) {
    const pgSql = this.convertSQLiteToPostgreSQL(sqlQuery);
    if (params && params.length > 0) {
      // Convert ? to $1, $2, etc. for parameterized queries
      let paramIndex = 1;
      const paramSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
      return await this.pool.query(paramSql, params);
    } else {
      return await this.pool.query(pgSql);
    }
  }
}

async function initializeDatabase() {
  db = new DatabaseWrapper(pool);

  // Retry connection logic
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      // Test connection first
      await pool.query('SELECT NOW()');
      console.log('✅ Database connection successful');
      break;
    } catch (error) {
      retryCount++;
      if (retryCount >= maxRetries) {
        console.error('❌ Failed to connect to database after', maxRetries, 'attempts');
        console.error('Error:', error.message);
        console.warn('⚠️  Server will start but database operations may fail');
        console.warn('⚠️  Please check your network connection and Neon DB database status');
        // Don't throw - allow server to start
        return db;
      }
      console.warn(`⚠️  Database connection attempt ${retryCount}/${maxRetries} failed, retrying in 2 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  try {
    // Check existing tables first
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const existingTables = tablesResult.rows.map(row => row.table_name);
    console.log('📋 Existing tables in database:', existingTables.join(', ') || 'none');
    
    // Check if tables exist, only create if they don't
    const tableExists = (tableName) => existingTables.includes(tableName);
    
    // Create brands table first (referenced by products)
    if (!tableExists('brands')) {
      console.log('📦 Creating brands table...');
      await db.exec(`
        CREATE TABLE brands (
          id SERIAL PRIMARY KEY,
          name_en VARCHAR(255) NOT NULL,
          name_ar VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      console.log('✅ brands table already exists');
    }

    // Create categories table (referenced by products and subcategories)
    if (!tableExists('categories')) {
      console.log('📦 Creating categories table...');
      await db.exec(`
        CREATE TABLE categories (
          id SERIAL PRIMARY KEY,
          name_en VARCHAR(255) NOT NULL,
          name_ar VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      console.log('✅ categories table already exists');
    }

    // Create subcategories table (referenced by products)
    if (!tableExists('subcategories')) {
      console.log('📦 Creating subcategories table...');
      await db.exec(`
        CREATE TABLE subcategories (
          id SERIAL PRIMARY KEY,
          category_id INTEGER,
          name_en VARCHAR(255) NOT NULL,
          name_ar VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
        )
      `);
    } else {
      console.log('✅ subcategories table already exists');
    }

    // Create products table (referenced by quotation_items)
    if (!tableExists('products')) {
      console.log('📦 Creating products table...');
      await db.exec(`
        CREATE TABLE products (
          id SERIAL PRIMARY KEY,
          name_en VARCHAR(255) NOT NULL,
          name_ar VARCHAR(255) NOT NULL,
          brand_id INTEGER,
          category_id INTEGER,
          subcategory_id INTEGER,
          model VARCHAR(255),
          slug VARCHAR(255) UNIQUE,
          price NUMERIC(10, 2),
          discount_price NUMERIC(10, 2),
          description_en TEXT,
          description_ar TEXT,
          specifications JSONB,
          images JSONB,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
          FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL
        )
      `);
    } else {
      console.log('✅ products table already exists');
    }

    // Quotations table
    if (!tableExists('quotations')) {
      console.log('📦 Creating quotations table...');
      await db.exec(`
        CREATE TABLE quotations (
          id SERIAL PRIMARY KEY,
          quotation_number VARCHAR(255) UNIQUE NOT NULL,
          customer_name VARCHAR(255) NOT NULL,
          customer_address TEXT,
          customer_phone VARCHAR(255),
          customer_email VARCHAR(255),
          date DATE NOT NULL,
          total NUMERIC(10, 2) NOT NULL DEFAULT 0,
          vat NUMERIC(10, 2) NOT NULL DEFAULT 0,
          grand_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
          notes TEXT,
          status VARCHAR(50) DEFAULT 'draft',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      console.log('✅ quotations table already exists');
    }

    // Quotation items table
    if (!tableExists('quotation_items')) {
      console.log('📦 Creating quotation_items table...');
      await db.exec(`
        CREATE TABLE quotation_items (
          id SERIAL PRIMARY KEY,
          quotation_id INTEGER NOT NULL,
          product_id INTEGER,
          line_number INTEGER NOT NULL,
          ref_no VARCHAR(255),
          description TEXT,
          model_no VARCHAR(255),
          image_path TEXT,
          qty INTEGER NOT NULL DEFAULT 1,
          unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
          line_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
        )
      `);
    } else {
      console.log('✅ quotation_items table already exists');
    }

    // Settings table for company info
    if (!tableExists('settings')) {
      console.log('📦 Creating settings table...');
      await db.exec(`
        CREATE TABLE settings (
          id SERIAL PRIMARY KEY,
          key VARCHAR(255) UNIQUE NOT NULL,
          value TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      console.log('✅ settings table already exists');
    }

    // Insert default settings if not exists
    const defaultSettings = [
      ['company_name', 'Horeca Host'],
      ['company_address', 'Dubai, U.A.E'],
      ['company_phone', '+971 50 307 9863'],
      ['company_email', 'gm@horecahost.com'],
      ['company_website', 'www.horecahost.com'],
      ['company_trn', 'TRN: 100XXXXXXXXX'],
      ['company_mobile', '+971 50 686 9484'],
      ['company_manager', 'Abdul Kabeer – General Manager'],
      ['vat_rate', '5'],
      ['currency', 'AED'],
      ['sales_terms', `Delivery: Delivery available stock now. Available in Dubai.
Note: Any down payment made by the customer prior to order cancellation is not refundable.
Thanks & waiting for your confirmation to enable us to proceed further.`],
      ['vat_note', `Value Added Tax (VAT) will be applicable to all taxable transactions as per the UAE law. "Effective from January 2018"`],
      ['quotation_message', `Waiting for your confirmation to enable us to proceed further.
Best Regards,
Abdul Kabeer – General Manager
Horeca Host
Tel: +971 50 307 9863 | Mobile: +971 50 686 9484
Email: gm@horecahost.com | Web: www.horecahost.com | Dubai, U.A.E`],
      ['terms_conditions', `1. Prices are valid for 30 days from the date of quotation.
2. Payment terms: 50% advance, 50% before delivery.
3. Delivery time: 2-4 weeks from order confirmation.
4. Prices are exclusive of installation unless otherwise stated.
5. All products carry manufacturer warranty.`],
      ['delivery_warranty', `Delivery: Free delivery within Dubai. Other emirates subject to additional charges.
Warranty: All equipment comes with 1 year manufacturer warranty against manufacturing defects.
Installation: Installation services available at additional cost.`],
      ['bank_details', `Bank Name: Emirates NBD
Account Name: Horeca Host
Account No: XXXX XXXX XXXX XXXX
IBAN: AE XX XXXX XXXX XXXX XXXX XXX`]
    ];

    for (const [key, value] of defaultSettings) {
      try {
        await db.query(
          'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
          [key, value]
        );
      } catch (e) {
        // Ignore if already exists
      }
    }

    console.log('✅ Database initialized successfully');
    return db;
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    console.warn('⚠️  Server will continue but database operations may fail');
    console.warn('⚠️  Error details:', error.code, error.errno);
    // Don't throw - allow server to start even if DB init fails
    // The app can still serve static files and show error messages
    return db;
  }
}

// Synchronous getter for the database (after initialization)
function getDb() {
  return db;
}

// Initialize on first require
let initPromise = null;
function initialize() {
  if (!initPromise) {
    initPromise = initializeDatabase();
  }
  return initPromise;
}

module.exports = {
  get db() {
    return db;
  },
  initialize,
  getDb,
  pool // Export pool for direct access if needed
};
