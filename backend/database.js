const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'quotations.db');

let db = null;

// Helper to save database to file
function saveDatabase() {
  if (db && db.sqlDb) {
    const data = db.sqlDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// Auto-save every 5 seconds if there are changes
let saveTimer = null;
function scheduleSave() {
  if (!saveTimer) {
    saveTimer = setTimeout(() => {
      saveDatabase();
      saveTimer = null;
    }, 5000);
  }
}

// Wrapper class to provide better-sqlite3-like API
class DatabaseWrapper {
  constructor(sqlDb) {
    this.sqlDb = sqlDb;
  }

  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        self.sqlDb.run(sql, params);
        scheduleSave();
        return {
          lastInsertRowid: self.sqlDb.exec("SELECT last_insert_rowid()")[0]?.values[0][0] || 0,
          changes: self.sqlDb.getRowsModified()
        };
      },
      get(...params) {
        const stmt = self.sqlDb.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const results = [];
        const stmt = self.sqlDb.prepare(sql);
        stmt.bind(params);
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      }
    };
  }

  exec(sql) {
    this.sqlDb.run(sql);
    scheduleSave();
  }

  pragma(sql) {
    this.sqlDb.run(`PRAGMA ${sql}`);
  }
}

async function initializeDatabase() {
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new DatabaseWrapper(new SQL.Database(fileBuffer));
    console.log('✅ Loaded existing database');
  } else {
    db = new DatabaseWrapper(new SQL.Database());
    console.log('✅ Created new database');
  }

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Products table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ref_no TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      model_no TEXT,
      image_path TEXT,
      unit_price REAL NOT NULL DEFAULT 0,
      country TEXT,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Quotations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_address TEXT,
      customer_phone TEXT,
      customer_email TEXT,
      date DATE NOT NULL,
      total REAL NOT NULL DEFAULT 0,
      vat REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Quotation items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS quotation_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_id INTEGER NOT NULL,
      product_id INTEGER,
      line_number INTEGER NOT NULL,
      ref_no TEXT,
      description TEXT,
      model_no TEXT,
      image_path TEXT,
      qty INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      line_total REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
  `);

  // Settings table for company info
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default settings if not exists
  const defaultSettings = [
    ['company_name', 'HORECA Equipment LLC'],
    ['company_address', 'Dubai, United Arab Emirates'],
    ['company_phone', '+971 4 XXX XXXX'],
    ['company_email', 'info@horeca-equipment.com'],
    ['company_website', 'www.horeca-equipment.com'],
    ['company_trn', 'TRN: 100XXXXXXXXX'],
    ['vat_rate', '5'],
    ['currency', 'AED'],
    ['terms_conditions', `1. Prices are valid for 30 days from the date of quotation.
2. Payment terms: 50% advance, 50% before delivery.
3. Delivery time: 2-4 weeks from order confirmation.
4. Prices are exclusive of installation unless otherwise stated.
5. All products carry manufacturer warranty.`],
    ['delivery_warranty', `Delivery: Free delivery within Dubai. Other emirates subject to additional charges.
Warranty: All equipment comes with 1 year manufacturer warranty against manufacturing defects.
Installation: Installation services available at additional cost.`],
    ['bank_details', `Bank Name: Emirates NBD
Account Name: HORECA Equipment LLC
Account No: XXXX XXXX XXXX XXXX
IBAN: AE XX XXXX XXXX XXXX XXXX XXX`]
  ];

  for (const [key, value] of defaultSettings) {
    try {
      db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run(key, value);
    } catch (e) {
      // Ignore if already exists
    }
  }

  // Save initial database
  saveDatabase();
  
  console.log('✅ Database initialized successfully');
  return db;
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
  saveDatabase
};
