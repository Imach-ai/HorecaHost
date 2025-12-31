require('dotenv').config();
const { initialize, getDb } = require('../database');

// Update existing products with HTTP URLs instead of FTP URLs
async function updateImageUrls() {
  try {
    console.log('🔄 Updating product image URLs from FTP to HTTP...');
    
    await initialize();
    const db = getDb();
    if (!db) {
      throw new Error('Database not initialized');
    }

    // Get all products with images
    const productsStmt = await db.prepare('SELECT id, images FROM products WHERE images IS NOT NULL');
    const products = await productsStmt.all();

    console.log(`Found ${products.length} products with images`);

    let updated = 0;
    for (const product of products) {
      try {
        let images = product.images;
        
        // Parse JSON if string
        if (typeof images === 'string') {
          images = JSON.parse(images);
        }
        
        if (!Array.isArray(images) || images.length === 0) continue;

        // Convert FTP URLs to HTTP URLs
        const updatedImages = images.map(url => {
          if (url && url.startsWith('ftp://')) {
            return url
              .replace(/^ftp:\/\/[^@]+@[^\/]+\/public_html/, 'https://www.horecahost.com')
              .replace(/^ftp:\/\/[^\/]+\/public_html/, 'https://www.horecahost.com');
          }
          return url;
        });

        // Check if any URLs were changed
        const hasChanges = images.some((url, i) => url !== updatedImages[i]);
        
        if (hasChanges) {
          const updateStmt = await db.prepare('UPDATE products SET images = ? WHERE id = ?');
          await updateStmt.run(JSON.stringify(updatedImages), product.id);
          updated++;
          
          if (updated % 50 === 0) {
            console.log(`  Updated ${updated} products...`);
          }
        }
      } catch (error) {
        console.error(`Error updating product ${product.id}:`, error.message);
      }
    }

    console.log(`\n✅ Updated ${updated} products with HTTP image URLs`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateImageUrls();

