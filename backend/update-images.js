const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, 'data/quotations.db');

async function updateImages() {
  const SQL = await initSqlJs();
  const filebuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(filebuffer);
  
  // Get all products
  const products = db.exec('SELECT id, name FROM products');
  if (products.length > 0) {
    console.log('Products found:', products[0].values.length);
    
    // Image mapping based on product names
    const imageMap = {
      'gas': '/uploads/products/gas-range.jpg',
      'range': '/uploads/products/gas-range.jpg',
      'refrigerator': '/uploads/products/refrigerator.jpg',
      'dishwasher': '/uploads/products/dishwasher.jpg',
      'table': '/uploads/products/work-table.jpg',
      'work': '/uploads/products/work-table.jpg',
      'oven': '/uploads/products/oven.jpg',
      'convection': '/uploads/products/oven.jpg'
    };
    
    products[0].values.forEach(row => {
      const [id, name] = row;
      const nameLower = name.toLowerCase();
      
      let imagePath = null;
      for (const [keyword, imgPath] of Object.entries(imageMap)) {
        if (nameLower.includes(keyword)) {
          imagePath = imgPath;
          break;
        }
      }
      
      if (imagePath) {
        db.run('UPDATE products SET image_path = ? WHERE id = ?', [imagePath, id]);
        console.log('Updated:', name, '->', imagePath);
      }
    });
    
    // Save database
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
    console.log('Database saved!');
  }
  
  db.close();
}

updateImages().catch(console.error);

