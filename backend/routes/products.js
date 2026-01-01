const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/products');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// GET all products with joins to brands, categories, subcategories
router.get('/', async (req, res) => {
  try {
    const { 
      category_id, 
      subcategory_id, 
      brand_id, 
      search, 
      active,
      page,
      limit,
      minimal = false // For quotation page - only return essential fields
    } = req.query;
    
    // Always use pagination (default to page 1, limit 50)
    // Always use pagination (default to page 1, limit 50)
    // Validate and sanitize page/limit values
    const pageNum = page ? Math.max(1, parseInt(page) || 1) : 1;
    const limitNum = limit ? Math.min(Math.max(1, parseInt(limit) || 50), 100) : 50;
    
    // Select minimal fields for quotation page (faster) - but include description and brand
    const selectFields = minimal === 'true' 
      ? `p.id, p.name_en, p.name_ar, p.model, p.slug, p.price, p.images, p.description_en, p.description_ar, b.name_en as brand_name_en, b.name_ar as brand_name_ar, b.country_en as brand_country_en, b.country_ar as brand_country_ar, b.flag_image as brand_flag_image`
      : `p.*,
        b.name_en as brand_name_en,
        b.name_ar as brand_name_ar,
        b.country_en as brand_country_en,
        b.country_ar as brand_country_ar,
        b.flag_image as brand_flag_image,
        c.name_en as category_name_en,
        c.name_ar as category_name_ar,
        s.name_en as subcategory_name_en,
        s.name_ar as subcategory_name_ar`;
    
    let query = `
      SELECT ${selectFields}
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories s ON p.subcategory_id = s.id
    `;
    const params = [];
    const conditions = [];

    if (category_id) {
      conditions.push('p.category_id = ?');
      params.push(category_id);
    }
    if (subcategory_id) {
      conditions.push('p.subcategory_id = ?');
      params.push(subcategory_id);
    }
    if (brand_id) {
      conditions.push('p.brand_id = ?');
      params.push(brand_id);
    }
    if (active !== undefined) {
      conditions.push('p.active = ?');
      params.push(active === 'true' || active === true);
    }
    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push('(p.name_en ILIKE ? OR p.name_ar ILIKE ? OR p.model ILIKE ? OR p.slug ILIKE ?)');
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY p.created_at DESC';
    
    // Always use pagination for products list (better performance)
    const offset = (pageNum - 1) * limitNum;
    
    // Get total count (use same WHERE conditions but no JOINs needed for count)
    const countQuery = `SELECT COUNT(*) as total FROM products p${conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''}`;
    const countStmt = await db.prepare(countQuery);
    const countResult = await countStmt.get(...params);
    const total = parseInt(countResult.total || 0);
    
    // Add pagination to main query
    query += ` LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);
    
    const stmt = await db.prepare(query);
    const products = await stmt.all(...params);
    
    return res.json({
      data: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: offset + limitNum < total
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error.message || error);
    res.status(500).json({ error: 'Failed to fetch products', details: error.message });
  }
});

// GET single product with joins
router.get('/:id', async (req, res) => {
  try {
    const stmt = await db.prepare(`
      SELECT 
        p.*,
        b.name_en as brand_name_en,
        b.name_ar as brand_name_ar,
        b.country_en as brand_country_en,
        b.country_ar as brand_country_ar,
        b.flag_image as brand_flag_image,
        c.name_en as category_name_en,
        c.name_ar as category_name_ar,
        s.name_en as subcategory_name_en,
        s.name_ar as subcategory_name_ar
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories s ON p.subcategory_id = s.id
      WHERE p.id = ?
    `);
    const product = await stmt.get(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// GET all categories
router.get('/meta/categories', async (req, res) => {
  try {
    const stmt = await db.prepare(
      "SELECT id, name_en, name_ar, slug FROM categories WHERE active = true ORDER BY name_en"
    );
    const categories = await stmt.all();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET all subcategories
router.get('/meta/subcategories', async (req, res) => {
  try {
    const { category_id } = req.query;
    let query = "SELECT id, category_id, name_en, name_ar, slug FROM subcategories WHERE active = true";
    const params = [];
    
    if (category_id) {
      query += " AND category_id = ?";
      params.push(category_id);
    }
    
    query += " ORDER BY name_en";
    
    const stmt = await db.prepare(query);
    const subcategories = await stmt.all(...params);
    res.json(subcategories);
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({ error: 'Failed to fetch subcategories' });
  }
});

// GET all brands
router.get('/meta/brands', async (req, res) => {
  try {
    // Check if country columns exist, if not select without them
    const stmt = await db.prepare(
      "SELECT id, name_en, name_ar, slug FROM brands WHERE active = true ORDER BY name_en"
    );
    const brands = await stmt.all();
    res.json(brands);
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// POST create product
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { 
      name_en, 
      name_ar, 
      brand_id, 
      category_id, 
      subcategory_id,
      model,
      slug,
      price,
      discount_price,
      description_en,
      description_ar,
      specifications,
      active
    } = req.body;

    if (!name_en || !name_ar) {
      return res.status(400).json({ error: 'Product name (both English and Arabic) are required' });
    }

    // Handle image upload - convert to JSONB array format
    let images = null;
    if (req.file) {
      const imageUrl = `/uploads/products/${req.file.filename}`;
      images = JSON.stringify([imageUrl]);
    }

    // Handle specifications as JSONB
    let specsJson = null;
    if (specifications) {
      try {
        specsJson = typeof specifications === 'string' ? specifications : JSON.stringify(specifications);
      } catch (e) {
        specsJson = null;
      }
    }

    const stmt = await db.prepare(`
      INSERT INTO products (
        name_en, name_ar, brand_id, category_id, subcategory_id, 
        model, slug, price, discount_price, description_en, description_ar, 
        specifications, images, active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `);
    
    const result = await stmt.run(
      name_en,
      name_ar,
      brand_id || null,
      category_id || null,
      subcategory_id || null,
      model || null,
      slug || null,
      price ? parseFloat(price) : null,
      discount_price ? parseFloat(discount_price) : null,
      description_en || null,
      description_ar || null,
      specsJson,
      images,
      active !== undefined ? (active === 'true' || active === true) : true
    );

    const productStmt = await db.prepare(`
      SELECT 
        p.*,
        b.name_en as brand_name_en,
        b.name_ar as brand_name_ar,
        c.name_en as category_name_en,
        c.name_ar as category_name_ar,
        s.name_en as subcategory_name_en,
        s.name_ar as subcategory_name_ar
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories s ON p.subcategory_id = s.id
      WHERE p.id = ?
    `);
    const product = await productStmt.get(result.insertId || result.lastInsertRowid);
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    if (error.code === '23505' || error.code === '23503') { // PostgreSQL unique violation
      return res.status(400).json({ error: 'Product with this name or slug already exists' });
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT update product
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name_en, 
      name_ar, 
      brand_id, 
      category_id, 
      subcategory_id,
      model,
      slug,
      price,
      discount_price,
      description_en,
      description_ar,
      specifications,
      active,
      images
    } = req.body;

    const existingStmt = await db.prepare('SELECT * FROM products WHERE id = ?');
    const existing = await existingStmt.get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Handle image upload - add to existing images array or create new
    let imagesJson = existing.images;
    if (req.file) {
      const imageUrl = `/uploads/products/${req.file.filename}`;
      try {
        const existingImages = existing.images ? (typeof existing.images === 'string' ? JSON.parse(existing.images) : existing.images) : [];
        existingImages.push(imageUrl);
        imagesJson = JSON.stringify(existingImages);
      } catch (e) {
        imagesJson = JSON.stringify([imageUrl]);
      }
    } else if (images) {
      // If images array provided in body, use it
      imagesJson = typeof images === 'string' ? images : JSON.stringify(images);
    }

    // Handle specifications as JSONB
    let specsJson = existing.specifications;
    if (specifications !== undefined) {
      try {
        specsJson = typeof specifications === 'string' ? specifications : JSON.stringify(specifications);
      } catch (e) {
        specsJson = null;
      }
    }

    const updateStmt = await db.prepare(`
      UPDATE products 
      SET name_en = ?, name_ar = ?, brand_id = ?, category_id = ?, subcategory_id = ?,
          model = ?, slug = ?, price = ?, discount_price = ?, 
          description_en = ?, description_ar = ?, specifications = ?, images = ?, 
          active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    await updateStmt.run(
      name_en || existing.name_en,
      name_ar || existing.name_ar,
      brand_id !== undefined ? (brand_id || null) : existing.brand_id,
      category_id !== undefined ? (category_id || null) : existing.category_id,
      subcategory_id !== undefined ? (subcategory_id || null) : existing.subcategory_id,
      model !== undefined ? model : existing.model,
      slug !== undefined ? slug : existing.slug,
      price !== undefined ? (price ? parseFloat(price) : null) : existing.price,
      discount_price !== undefined ? (discount_price ? parseFloat(discount_price) : null) : existing.discount_price,
      description_en !== undefined ? description_en : existing.description_en,
      description_ar !== undefined ? description_ar : existing.description_ar,
      specsJson,
      imagesJson,
      active !== undefined ? (active === 'true' || active === true) : existing.active,
      id
    );

    const productStmt = await db.prepare(`
      SELECT 
        p.*,
        b.name_en as brand_name_en,
        b.name_ar as brand_name_ar,
        c.name_en as category_name_en,
        c.name_ar as category_name_ar,
        s.name_en as subcategory_name_en,
        s.name_ar as subcategory_name_ar
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories s ON p.subcategory_id = s.id
      WHERE p.id = ?
    `);
    const product = await productStmt.get(id);
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    if (error.code === '23505' || error.code === '23503') { // PostgreSQL unique violation
      return res.status(400).json({ error: 'Product with this name or slug already exists' });
    }
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE product
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingStmt = await db.prepare('SELECT * FROM products WHERE id = ?');
    const existing = await existingStmt.get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete images if exists
    if (existing.images) {
      try {
        const imageArray = typeof existing.images === 'string' ? JSON.parse(existing.images) : existing.images;
        for (const imageUrl of imageArray) {
          if (imageUrl && imageUrl.startsWith('/uploads/')) {
            const imagePath = path.join(__dirname, '..', imageUrl);
            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath);
            }
          }
        }
      } catch (e) {
        // Ignore errors in image deletion
      }
    }

    const deleteStmt = await db.prepare('DELETE FROM products WHERE id = ?');
    await deleteStmt.run(id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
