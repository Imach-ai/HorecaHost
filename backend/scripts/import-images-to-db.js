require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('basic-ftp');
const stream = require('stream');
const { initialize, getDb } = require('../database');

// FTP Configuration
const FTP_CONFIG = {
  host: 'gator4456.hostgator.com',
  port: 21,
  user: 'admin@horecahost.com',
  password: Buffer.from('b1ZmLWRXbTdkSy1X', 'base64').toString('utf-8'),
  basePath: '/public_html/posted_images/product/300x300'
};

// Statistics
const stats = {
  total: 0,
  downloaded: 0,
  stored: 0,
  skipped: 0,
  errors: 0,
  notFound: 0
};

const errors = [];

// Helper: Download file from FTP to buffer
async function downloadToBuffer(client, remotePath) {
  const chunks = [];
  const writable = new stream.Writable({
    write(chunk, encoding, callback) {
      chunks.push(chunk);
      callback();
    }
  });
  
  await client.downloadTo(writable, remotePath);
  return Buffer.concat(chunks);
}

// Helper: Extract product ID from filename
function extractProductId(filename) {
  // Patterns:
  // - post_47450_810.png (actual pattern: post_{number}_{productId}.png)
  // - post_0000_313.png (alternative: post_0000_{productId}.png)
  // - post_313.png (simple: post_{productId}.png)
  
  // Try to match the actual pattern first: post_{anything}_{productId}.{ext}
  const patterns = [
    /post_\d+_(\d+)\.(png|jpg|jpeg)$/i,  // post_47450_810.png
    /post_0000_(\d+)\.(png|jpg|jpeg)$/i, // post_0000_313.png
    /post_(\d+)\.(png|jpg|jpeg)$/i       // post_313.png
  ];
  
  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  
  return null;
}

// Main import function
async function importImages() {
  try {
    console.log('🚀 Starting Image Import to Database...');
    console.log('='.repeat(60));
    
    await initialize();
    const db = getDb();
    if (!db) {
      throw new Error('Database not initialized');
    }

    // Ensure image columns exist
    const checkStmt = await db.prepare(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'image_data'
    `);
    const hasColumn = await checkStmt.get();
    
    if (!hasColumn) {
      console.log('⚠️  image_data column not found. Running schema update...');
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec('node scripts/add-image-column.js', (error, stdout, stderr) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }

    console.log('\n📡 Connecting to FTP server...');
    const client = new Client();
    client.ftp.timeout = 30000;
    client.ftp.keepAlive = 30000;

    // Connect with retry
    let connected = false;
    let retries = 3;
    while (!connected && retries > 0) {
      try {
        await client.access({
          host: FTP_CONFIG.host,
          user: FTP_CONFIG.user,
          password: FTP_CONFIG.password,
          secure: false
        });
        await client.ensureDir(FTP_CONFIG.basePath);
        connected = true;
        console.log('✅ Connected to FTP server');
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        console.log(`⚠️  Connection failed, retrying... (${3 - retries}/3)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // List all files in the directory
    console.log('\n📋 Listing files from FTP...');
    const files = await client.list(FTP_CONFIG.basePath);
    console.log(`Found ${files.length} files in directory`);
    
    // Debug: Show first few files
    if (files.length > 0) {
      console.log('\nSample files:');
      files.slice(0, 5).forEach(file => {
        console.log(`  - ${file.name || file} (type: ${typeof file})`);
      });
    }

    // Filter PNG files and extract product IDs
    // Handle both object format {name, size} and string format
    const imageFiles = files
      .map(file => {
        const filename = typeof file === 'string' ? file : (file.name || file);
        return { filename, size: file.size || 0 };
      })
      .filter(file => file.filename && (file.filename.endsWith('.png') || file.filename.endsWith('.jpg') || file.filename.endsWith('.jpeg')))
      .map(file => ({
        filename: file.filename,
        productId: extractProductId(file.filename),
        size: file.size
      }))
      .filter(file => file.productId !== null);

    stats.total = imageFiles.length;
    console.log(`\n📦 Found ${stats.total} image files matching product ID pattern`);

    // Get all product IDs from database
    const productsStmt = await db.prepare('SELECT id FROM products');
    const products = await productsStmt.all();
    const productIds = new Set(products.map(p => p.id));
    console.log(`📊 Found ${productIds.size} products in database`);

    // Process each image
    console.log('\n⬇️  Downloading and storing images...\n');
    let processed = 0;

    for (const imageFile of imageFiles) {
      processed++;
      const { filename, productId, size } = imageFile;

      try {
        // Check if product exists
        if (!productIds.has(productId)) {
          stats.notFound++;
          if (processed % 50 === 0) {
            console.log(`  Progress: ${processed}/${stats.total} (Skipped ${stats.notFound} - product not found)`);
          }
          continue;
        }

        // Check if image already stored
        const checkStmt = await db.prepare('SELECT image_data FROM products WHERE id = ?');
        const existing = await checkStmt.get(productId);
        
        if (existing && existing.image_data) {
          stats.skipped++;
          if (processed % 50 === 0) {
            console.log(`  Progress: ${processed}/${stats.total} (Skipped ${stats.skipped} - already stored)`);
          }
          continue;
        }

        // Download image
        const remotePath = `${FTP_CONFIG.basePath}/${filename}`;
        const imageBuffer = await downloadToBuffer(client, remotePath);
        stats.downloaded++;

        // Store in database
        const updateStmt = await db.prepare(`
          UPDATE products 
          SET image_data = ?, image_mime_type = 'image/png'
          WHERE id = ?
        `);
        await updateStmt.run(imageBuffer, productId);
        stats.stored++;

        // Update images JSONB field with metadata
        const imagesStmt = await db.prepare('SELECT images FROM products WHERE id = ?');
        const product = await imagesStmt.get(productId);
        let imagesArray = [];
        
        if (product.images) {
          try {
            imagesArray = typeof product.images === 'string' 
              ? JSON.parse(product.images) 
              : product.images;
          } catch (e) {
            imagesArray = [];
          }
        }
        
        // Add reference to stored image
        if (!imagesArray.includes(`/api/images/product/${productId}`)) {
          imagesArray.push(`/api/images/product/${productId}`);
          const updateImagesStmt = await db.prepare('UPDATE products SET images = ? WHERE id = ?');
          await updateImagesStmt.run(JSON.stringify(imagesArray), productId);
        }

        if (processed % 10 === 0 || processed === stats.total) {
          const percent = ((processed / stats.total) * 100).toFixed(1);
          console.log(`  Progress: ${processed}/${stats.total} (${percent}%) - Stored: ${stats.stored}, Skipped: ${stats.skipped}, Errors: ${stats.errors}`);
        }
      } catch (error) {
        stats.errors++;
        const errorMsg = `Error processing ${filename} (Product ID: ${productId}): ${error.message}`;
        errors.push(errorMsg);
        console.error(`  ❌ ${errorMsg}`);
      }
    }

    // Close FTP connection
    await client.close();
    console.log('\n✅ FTP connection closed');

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total files found: ${stats.total}`);
    console.log(`Downloaded: ${stats.downloaded}`);
    console.log(`Stored in database: ${stats.stored}`);
    console.log(`Skipped (already stored): ${stats.skipped}`);
    console.log(`Skipped (product not found): ${stats.notFound}`);
    console.log(`Errors: ${stats.errors}`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.slice(0, 20).forEach(err => console.log(`   ${err}`));
      if (errors.length > 20) {
        console.log(`   ... and ${errors.length - 20} more errors`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Image import completed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

importImages();

