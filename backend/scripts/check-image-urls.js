require('dotenv').config();
const { initialize, getDb } = require('../database');
const https = require('https');
const http = require('http');

async function checkImageUrls() {
  try {
    await initialize();
    const db = getDb();
    
    // Get sample products
    const stmt = await db.prepare('SELECT id, name_en, images FROM products WHERE images IS NOT NULL LIMIT 5');
    const products = await stmt.all();
    
    console.log('📸 Checking Image URLs in Database:\n');
    
    for (const product of products) {
      let images = product.images;
      if (typeof images === 'string') {
        images = JSON.parse(images);
      }
      
      if (Array.isArray(images) && images.length > 0) {
        const url = images[0];
        console.log(`Product ${product.id} (${product.name_en}):`);
        console.log(`  URL: ${url}`);
        console.log('');
      }
    }
    
    // Test different URL patterns
    console.log('\n🧪 Testing Image URL Patterns:\n');
    
    const testUrls = [
      'https://www.horecahost.com/posted_images/product/300x300/post_0000_3.jpg',
      'https://horecahost.com/posted_images/product/300x300/post_0000_3.jpg',
      'http://www.horecahost.com/posted_images/product/300x300/post_0000_3.jpg',
      'http://horecahost.com/posted_images/product/300x300/post_0000_3.jpg',
      'https://gator4456.hostgator.com/posted_images/product/300x300/post_0000_3.jpg',
    ];
    
    for (const testUrl of testUrls) {
      await testImageUrl(testUrl);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

function testImageUrl(url) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = protocol.get(url, (res) => {
      console.log(`  ${res.statusCode === 200 ? '✅' : '❌'} ${url}`);
      console.log(`     Status: ${res.statusCode}`);
      if (res.statusCode === 200) {
        console.log(`     Content-Type: ${res.headers['content-type']}`);
      }
      console.log('');
      resolve();
    });
    
    req.on('error', (error) => {
      console.log(`  ❌ ${url}`);
      console.log(`     Error: ${error.message}`);
      console.log('');
      resolve();
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      console.log(`  ⏱️  ${url}`);
      console.log(`     Timeout`);
      console.log('');
      resolve();
    });
  });
}

checkImageUrls();

