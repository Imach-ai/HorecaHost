const express = require('express');
const { db } = require('../database');

const router = express.Router();

// Helper function to generate slug
function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// GET all subcategories
router.get('/', async (req, res) => {
  try {
    const { category_id, active, search } = req.query;
    let query = `
      SELECT s.*, c.name_en as category_name_en, c.name_ar as category_name_ar
      FROM subcategories s
      LEFT JOIN categories c ON s.category_id = c.id
    `;
    const params = [];
    const conditions = [];

    if (category_id) {
      conditions.push('s.category_id = ?');
      params.push(category_id);
    }
    if (active !== undefined) {
      conditions.push('s.active = ?');
      params.push(active === 'true' || active === true);
    }
    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push('(s.name_en ILIKE ? OR s.name_ar ILIKE ?)');
      params.push(searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY s.name_en ASC';

    const stmt = await db.prepare(query);
    const subcategories = await stmt.all(...params);
    res.json(subcategories);
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({ error: 'Failed to fetch subcategories' });
  }
});

// GET single subcategory
router.get('/:id', async (req, res) => {
  try {
    const stmt = await db.prepare(`
      SELECT s.*, c.name_en as category_name_en, c.name_ar as category_name_ar
      FROM subcategories s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.id = ?
    `);
    const subcategory = await stmt.get(req.params.id);
    if (!subcategory) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }
    res.json(subcategory);
  } catch (error) {
    console.error('Error fetching subcategory:', error);
    res.status(500).json({ error: 'Failed to fetch subcategory' });
  }
});

// POST create subcategory
router.post('/', async (req, res) => {
  try {
    const { name_en, name_ar, category_id, slug, active } = req.body;

    if (!name_en || !name_ar) {
      return res.status(400).json({ error: 'Subcategory name (both English and Arabic) are required' });
    }

    // Validate category exists if provided
    if (category_id) {
      const categoryStmt = await db.prepare('SELECT id FROM categories WHERE id = ?');
      const category = await categoryStmt.get(category_id);
      if (!category) {
        return res.status(400).json({ error: 'Category not found' });
      }
    }

    const subcategorySlug = slug || generateSlug(name_en);

    const stmt = await db.prepare(`
      INSERT INTO subcategories (name_en, name_ar, category_id, slug, active)
      VALUES (?, ?, ?, ?, ?)
      RETURNING id
    `);

    const result = await stmt.run(
      name_en,
      name_ar,
      category_id || null,
      subcategorySlug,
      active !== undefined ? (active === 'true' || active === true) : true
    );

    const subcategoryStmt = await db.prepare(`
      SELECT s.*, c.name_en as category_name_en, c.name_ar as category_name_ar
      FROM subcategories s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.id = ?
    `);
    const subcategory = await subcategoryStmt.get(result.insertId || result.lastInsertRowid);
    res.status(201).json(subcategory);
  } catch (error) {
    console.error('Error creating subcategory:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Subcategory with this name or slug already exists' });
    }
    res.status(500).json({ error: 'Failed to create subcategory' });
  }
});

// PUT update subcategory
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name_en, name_ar, category_id, slug, active } = req.body;

    const existingStmt = await db.prepare('SELECT * FROM subcategories WHERE id = ?');
    const existing = await existingStmt.get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    // Validate category exists if provided
    if (category_id && category_id !== existing.category_id) {
      const categoryStmt = await db.prepare('SELECT id FROM categories WHERE id = ?');
      const category = await categoryStmt.get(category_id);
      if (!category) {
        return res.status(400).json({ error: 'Category not found' });
      }
    }

    const subcategorySlug = slug || (name_en ? generateSlug(name_en) : existing.slug);

    const updateStmt = await db.prepare(`
      UPDATE subcategories 
      SET name_en = ?, name_ar = ?, category_id = ?, slug = ?, active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    await updateStmt.run(
      name_en || existing.name_en,
      name_ar || existing.name_ar,
      category_id !== undefined ? (category_id || null) : existing.category_id,
      subcategorySlug,
      active !== undefined ? (active === 'true' || active === true) : existing.active,
      id
    );

    const subcategoryStmt = await db.prepare(`
      SELECT s.*, c.name_en as category_name_en, c.name_ar as category_name_ar
      FROM subcategories s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.id = ?
    `);
    const subcategory = await subcategoryStmt.get(id);
    res.json(subcategory);
  } catch (error) {
    console.error('Error updating subcategory:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Subcategory with this name or slug already exists' });
    }
    res.status(500).json({ error: 'Failed to update subcategory' });
  }
});

// DELETE subcategory
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if subcategory is used in products
    const productsStmt = await db.prepare('SELECT COUNT(*) as count FROM products WHERE subcategory_id = ?');
    const products = await productsStmt.get(id);
    
    if (products.count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete subcategory. It is used by ${products.count} product(s). Please remove or reassign products first.` 
      });
    }

    const deleteStmt = await db.prepare('DELETE FROM subcategories WHERE id = ?');
    await deleteStmt.run(id);
    res.json({ message: 'Subcategory deleted successfully' });
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    res.status(500).json({ error: 'Failed to delete subcategory' });
  }
});

module.exports = router;

