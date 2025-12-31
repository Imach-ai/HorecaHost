require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { initialize, getDb } = require('../database');

// FTP Configuration
const FTP_CONFIG = {
  host: 'gator4456.hostgator.com',
  port: 21,
  user: 'admin@horecahost.com',
  password: Buffer.from('b1ZmLWRXbTdkSy1X', 'base64').toString('utf-8'),
  basePath: '/public_html/posted_images/product/300x300'
};

// Image URL base (HTTP URL format - files in public_html are accessible via HTTP)
const IMAGE_BASE_URL = 'https://www.horecahost.com/posted_images/product/300x300';

// Statistics
const stats = {
  brands: { total: 0, imported: 0, skipped: 0, errors: 0 },
  categories: { total: 0, imported: 0, skipped: 0, errors: 0 },
  subcategories: { total: 0, imported: 0, skipped: 0, errors: 0 },
  products: { total: 0, imported: 0, skipped: 0, errors: 0 }
};

const errors = [];

// Helper: Parse CSV file
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Helper: Build image URL from product ID
function buildImageUrl(productId) {
  // Pattern: post_0000_{id}.png (all files are PNG format)
  const variations = [
    `post_0000_${productId}.png`,
    `post_0000_${productId}.jpg`, // Fallback
    `post_${productId}.png`, // Alternative pattern
    `post_${productId}.jpg` // Fallback
  ];
  
  // Return array with first variation (PNG is primary format)
  return [`${IMAGE_BASE_URL}/${variations[0]}`];
}

// Helper: Parse JSON safely
function parseJSON(value) {
  if (!value || value === '{}' || value === '[]' || value.trim() === '') {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch (e) {
    return null;
  }
}

// Helper: Convert boolean
function toBoolean(value) {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value !== null && value !== undefined && value !== '';
}

// Helper: Convert to number or null
function toNumber(value) {
  if (!value || value === '' || value === 'null') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

// Import Brands
async function importBrands(csvPath) {
  const db = getDb();
  console.log('\n📦 Importing Brands...');
  const brands = await parseCSV(csvPath);
  stats.brands.total = brands.length;

  for (const brand of brands) {
    try {
      // Check if exists
      const existing = await db.prepare('SELECT id FROM brands WHERE id = ?');
      const exists = await existing.get(brand.id);

      if (exists) {
        // Update existing
        const updateStmt = await db.prepare(`
          UPDATE brands 
          SET name_en = ?, name_ar = ?, slug = ?, active = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        await updateStmt.run(
          brand.name_en || '',
          brand.name_ar || '',
          brand.slug || '',
          toBoolean(brand.active),
          brand.id
        );
        stats.brands.imported++;
        console.log(`  ✓ Updated brand: ${brand.name_en} (ID: ${brand.id})`);
      } else {
        // Insert new - use explicit ID and update sequence
        const insertStmt = await db.prepare(`
          INSERT INTO brands (id, name_en, name_ar, slug, active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        await insertStmt.run(
          parseInt(brand.id),
          brand.name_en || '',
          brand.name_ar || '',
          brand.slug || '',
          toBoolean(brand.active),
          brand.created_at || new Date().toISOString(),
          brand.updated_at || new Date().toISOString()
        );
        // Update sequence to be at least the inserted ID
        await db.exec(`SELECT setval('brands_id_seq', GREATEST((SELECT MAX(id) FROM brands), ${parseInt(brand.id)}))`);
        stats.brands.imported++;
        console.log(`  ✓ Imported brand: ${brand.name_en} (ID: ${brand.id})`);
      }
    } catch (error) {
      stats.brands.errors++;
      const errorMsg = `Error importing brand ID ${brand.id}: ${error.message}`;
      errors.push(errorMsg);
      console.error(`  ✗ ${errorMsg}`);
    }
  }
}

// Import Categories
async function importCategories(csvPath) {
  const db = getDb();
  console.log('\n📁 Importing Categories...');
  const categories = await parseCSV(csvPath);
  stats.categories.total = categories.length;

  for (const category of categories) {
    try {
      const existing = await db.prepare('SELECT id FROM categories WHERE id = ?');
      const exists = await existing.get(category.id);

      if (exists) {
        const updateStmt = await db.prepare(`
          UPDATE categories 
          SET name_en = ?, name_ar = ?, slug = ?, active = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        await updateStmt.run(
          category.name_en || '',
          category.name_ar || '',
          category.slug || '',
          toBoolean(category.active),
          category.id
        );
        stats.categories.imported++;
        console.log(`  ✓ Updated category: ${category.name_en} (ID: ${category.id})`);
      } else {
        const insertStmt = await db.prepare(`
          INSERT INTO categories (id, name_en, name_ar, slug, active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        await insertStmt.run(
          parseInt(category.id),
          category.name_en || '',
          category.name_ar || '',
          category.slug || '',
          toBoolean(category.active),
          category.created_at || new Date().toISOString(),
          category.updated_at || new Date().toISOString()
        );
        // Update sequence
        await db.exec(`SELECT setval('categories_id_seq', GREATEST((SELECT MAX(id) FROM categories), ${parseInt(category.id)}))`);
        stats.categories.imported++;
        console.log(`  ✓ Imported category: ${category.name_en} (ID: ${category.id})`);
      }
    } catch (error) {
      stats.categories.errors++;
      const errorMsg = `Error importing category ID ${category.id}: ${error.message}`;
      errors.push(errorMsg);
      console.error(`  ✗ ${errorMsg}`);
    }
  }
}

// Import Subcategories
async function importSubcategories(csvPath) {
  const db = getDb();
  console.log('\n📂 Importing Subcategories...');
  const subcategories = await parseCSV(csvPath);
  stats.subcategories.total = subcategories.length;

  for (const subcategory of subcategories) {
    try {
      const existing = await db.prepare('SELECT id FROM subcategories WHERE id = ?');
      const exists = await existing.get(subcategory.id);

      if (exists) {
        const updateStmt = await db.prepare(`
          UPDATE subcategories 
          SET category_id = ?, name_en = ?, name_ar = ?, slug = ?, active = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        await updateStmt.run(
          subcategory.category_id ? parseInt(subcategory.category_id) : null,
          subcategory.name_en || '',
          subcategory.name_ar || '',
          subcategory.slug || '',
          toBoolean(subcategory.active),
          subcategory.id
        );
        stats.subcategories.imported++;
        console.log(`  ✓ Updated subcategory: ${subcategory.name_en} (ID: ${subcategory.id})`);
      } else {
        const insertStmt = await db.prepare(`
          INSERT INTO subcategories (id, category_id, name_en, name_ar, slug, active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        await insertStmt.run(
          parseInt(subcategory.id),
          subcategory.category_id ? parseInt(subcategory.category_id) : null,
          subcategory.name_en || '',
          subcategory.name_ar || '',
          subcategory.slug || '',
          toBoolean(subcategory.active),
          subcategory.created_at || new Date().toISOString(),
          subcategory.updated_at || new Date().toISOString()
        );
        // Update sequence
        await db.exec(`SELECT setval('subcategories_id_seq', GREATEST((SELECT MAX(id) FROM subcategories), ${parseInt(subcategory.id)}))`);
        stats.subcategories.imported++;
        console.log(`  ✓ Imported subcategory: ${subcategory.name_en} (ID: ${subcategory.id})`);
      }
    } catch (error) {
      stats.subcategories.errors++;
      const errorMsg = `Error importing subcategory ID ${subcategory.id}: ${error.message}`;
      errors.push(errorMsg);
      console.error(`  ✗ ${errorMsg}`);
    }
  }
}

// Import Products
async function importProducts(csvPath) {
  const db = getDb();
  console.log('\n🛍️  Importing Products...');
  const products = await parseCSV(csvPath);
  stats.products.total = products.length;

  let processed = 0;
  const batchSize = 100;

  for (const product of products) {
    try {
      processed++;
      const productId = parseInt(product.id);

      // Build image URL from product ID
      const imageUrls = buildImageUrl(productId);
      const imagesJson = JSON.stringify(imageUrls);

      // Parse specifications
      const specsEn = parseJSON(product.specifications_en);
      const specsAr = parseJSON(product.specifications_ar);
      const specifications = specsEn || specsAr || null;
      const specsJson = specifications ? JSON.stringify(specifications) : null;

      const existing = await db.prepare('SELECT id FROM products WHERE id = ?');
      const exists = await existing.get(productId);

      if (exists) {
        const updateStmt = await db.prepare(`
          UPDATE products 
          SET brand_id = ?, category_id = ?, subcategory_id = ?,
              name_en = ?, name_ar = ?, model = ?, slug = ?,
              price = ?, discount_price = ?,
              description_en = ?, description_ar = ?,
              specifications = ?, images = ?,
              active = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        await updateStmt.run(
          product.brand_id ? parseInt(product.brand_id) : null,
          product.category_id ? parseInt(product.category_id) : null,
          product.subcategory_id ? parseInt(product.subcategory_id) : null,
          product.name_en || '',
          product.name_ar || '',
          product.model || null,
          product.slug || null,
          toNumber(product.price),
          toNumber(product.discount_price),
          product.description_en || null,
          product.description_ar || null,
          specsJson,
          imagesJson,
          toBoolean(product.active),
          productId
        );
        stats.products.imported++;
      } else {
        const insertStmt = await db.prepare(`
          INSERT INTO products (
            id, brand_id, category_id, subcategory_id,
            name_en, name_ar, model, slug,
            price, discount_price,
            description_en, description_ar,
            specifications, images,
            active, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        await insertStmt.run(
          productId,
          product.brand_id ? parseInt(product.brand_id) : null,
          product.category_id ? parseInt(product.category_id) : null,
          product.subcategory_id ? parseInt(product.subcategory_id) : null,
          product.name_en || '',
          product.name_ar || '',
          product.model || null,
          product.slug || null,
          toNumber(product.price),
          toNumber(product.discount_price),
          product.description_en || null,
          product.description_ar || null,
          specsJson,
          imagesJson,
          toBoolean(product.active),
          product.created_at || new Date().toISOString(),
          product.updated_at || new Date().toISOString()
        );
        // Update sequence for products
        await db.exec(`SELECT setval('products_id_seq', GREATEST((SELECT MAX(id) FROM products), ${productId}))`);
        stats.products.imported++;
      }

      if (processed % batchSize === 0) {
        console.log(`  Progress: ${processed}/${stats.products.total} products processed...`);
      }
    } catch (error) {
      stats.products.errors++;
      const errorMsg = `Error importing product ID ${product.id}: ${error.message}`;
      errors.push(errorMsg);
      console.error(`  ✗ ${errorMsg}`);
    }
  }
}

// Print summary
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  
  console.log('\n📦 Brands:');
  console.log(`   Total: ${stats.brands.total}`);
  console.log(`   Imported/Updated: ${stats.brands.imported}`);
  console.log(`   Errors: ${stats.brands.errors}`);

  console.log('\n📁 Categories:');
  console.log(`   Total: ${stats.categories.total}`);
  console.log(`   Imported/Updated: ${stats.categories.imported}`);
  console.log(`   Errors: ${stats.categories.errors}`);

  console.log('\n📂 Subcategories:');
  console.log(`   Total: ${stats.subcategories.total}`);
  console.log(`   Imported/Updated: ${stats.subcategories.imported}`);
  console.log(`   Errors: ${stats.subcategories.errors}`);

  console.log('\n🛍️  Products:');
  console.log(`   Total: ${stats.products.total}`);
  console.log(`   Imported/Updated: ${stats.products.imported}`);
  console.log(`   Errors: ${stats.products.errors}`);

  if (errors.length > 0) {
    console.log('\n❌ ERRORS:');
    errors.slice(0, 20).forEach(err => console.log(`   ${err}`));
    if (errors.length > 20) {
      console.log(`   ... and ${errors.length - 20} more errors`);
    }
  }

  console.log('\n' + '='.repeat(60));
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting CSV Data Import...');
    console.log('='.repeat(60));

    // Initialize database connection
    await initialize();
    const db = getDb();
    if (!db) {
      throw new Error('Database not initialized');
    }
    console.log('✅ Database connected');

    // Get CSV file paths
    const dataDir = path.join(__dirname, '../../data_sample_schema');
    const brandsPath = path.join(dataDir, 'brands.csv');
    const categoriesPath = path.join(dataDir, 'categories.csv');
    const subcategoriesPath = path.join(dataDir, 'subcategories.csv');
    const productsPath = path.join(dataDir, 'products.csv');

    // Verify files exist
    [brandsPath, categoriesPath, subcategoriesPath, productsPath].forEach(file => {
      if (!fs.existsSync(file)) {
        throw new Error(`CSV file not found: ${file}`);
      }
    });

    // Import in order (respecting foreign keys)
    await importBrands(brandsPath);
    await importCategories(categoriesPath);
    await importSubcategories(subcategoriesPath);
    await importProducts(productsPath);

    // Print summary
    printSummary();

    console.log('\n✅ Import completed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    printSummary();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, importBrands, importCategories, importSubcategories, importProducts };

