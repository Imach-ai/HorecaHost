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

// GET all categories
router.get('/', async (req, res) => {
  try {
    const { active, search } = req.query;
    let query = 'SELECT * FROM categories';
    const params = [];
    const conditions = [];

    if (active !== undefined) {
      conditions.push('active = ?');
      params.push(active === 'true' || active === true);
    }
    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push('(name_en ILIKE ? OR name_ar ILIKE ?)');
      params.push(searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY name_en ASC';

    const stmt = await db.prepare(query);
    const categories = await stmt.all(...params);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET single category
router.get('/:id', async (req, res) => {
  try {
    const stmt = await db.prepare('SELECT * FROM categories WHERE id = ?');
    const category = await stmt.get(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// POST create category
router.post('/', async (req, res) => {
  try {
    const { name_en, name_ar, slug, active } = req.body;

    if (!name_en || !name_ar) {
      return res.status(400).json({ error: 'Category name (both English and Arabic) are required' });
    }

    const categorySlug = slug || generateSlug(name_en);

    const stmt = await db.prepare(`
      INSERT INTO categories (name_en, name_ar, slug, active)
      VALUES (?, ?, ?, ?)
      RETURNING id
    `);

    const result = await stmt.run(
      name_en,
      name_ar,
      categorySlug,
      active !== undefined ? (active === 'true' || active === true) : true
    );

    const categoryStmt = await db.prepare('SELECT * FROM categories WHERE id = ?');
    const category = await categoryStmt.get(result.insertId || result.lastInsertRowid);
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Category with this name or slug already exists' });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT update category
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name_en, name_ar, slug, active } = req.body;

    const existingStmt = await db.prepare('SELECT * FROM categories WHERE id = ?');
    const existing = await existingStmt.get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const categorySlug = slug || (name_en ? generateSlug(name_en) : existing.slug);

    const updateStmt = await db.prepare(`
      UPDATE categories 
      SET name_en = ?, name_ar = ?, slug = ?, active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    await updateStmt.run(
      name_en || existing.name_en,
      name_ar || existing.name_ar,
      categorySlug,
      active !== undefined ? (active === 'true' || active === true) : existing.active,
      id
    );

    const categoryStmt = await db.prepare('SELECT * FROM categories WHERE id = ?');
    const category = await categoryStmt.get(id);
    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Category with this name or slug already exists' });
    }
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category is used in products
    const productsStmt = await db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?');
    const products = await productsStmt.get(id);
    
    // Check if category is used in subcategories
    const subcategoriesStmt = await db.prepare('SELECT COUNT(*) as count FROM subcategories WHERE category_id = ?');
    const subcategories = await subcategoriesStmt.get(id);
    
    if (products.count > 0 || subcategories.count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category. It is used by ${products.count} product(s) and ${subcategories.count} subcategory(ies). Please remove or reassign them first.` 
      });
    }

    const deleteStmt = await db.prepare('DELETE FROM categories WHERE id = ?');
    await deleteStmt.run(id);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;

