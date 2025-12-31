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

// GET all brands
router.get('/', async (req, res) => {
  try {
    const { active, search } = req.query;
    let query = 'SELECT * FROM brands';
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
    const brands = await stmt.all(...params);
    res.json(brands);
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// GET single brand
router.get('/:id', async (req, res) => {
  try {
    const stmt = await db.prepare('SELECT * FROM brands WHERE id = ?');
    const brand = await stmt.get(req.params.id);
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    res.json(brand);
  } catch (error) {
    console.error('Error fetching brand:', error);
    res.status(500).json({ error: 'Failed to fetch brand' });
  }
});

// POST create brand
router.post('/', async (req, res) => {
  try {
    const { name_en, name_ar, slug, active } = req.body;

    if (!name_en || !name_ar) {
      return res.status(400).json({ error: 'Brand name (both English and Arabic) are required' });
    }

    const brandSlug = slug || generateSlug(name_en);

    const stmt = await db.prepare(`
      INSERT INTO brands (name_en, name_ar, slug, active)
      VALUES (?, ?, ?, ?)
      RETURNING id
    `);

    const result = await stmt.run(
      name_en,
      name_ar,
      brandSlug,
      active !== undefined ? (active === 'true' || active === true) : true
    );

    const brandStmt = await db.prepare('SELECT * FROM brands WHERE id = ?');
    const brand = await brandStmt.get(result.insertId || result.lastInsertRowid);
    res.status(201).json(brand);
  } catch (error) {
    console.error('Error creating brand:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Brand with this name or slug already exists' });
    }
    res.status(500).json({ error: 'Failed to create brand' });
  }
});

// PUT update brand
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name_en, name_ar, slug, active } = req.body;

    const existingStmt = await db.prepare('SELECT * FROM brands WHERE id = ?');
    const existing = await existingStmt.get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    const brandSlug = slug || (name_en ? generateSlug(name_en) : existing.slug);

    const updateStmt = await db.prepare(`
      UPDATE brands 
      SET name_en = ?, name_ar = ?, slug = ?, active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    await updateStmt.run(
      name_en || existing.name_en,
      name_ar || existing.name_ar,
      brandSlug,
      active !== undefined ? (active === 'true' || active === true) : existing.active,
      id
    );

    const brandStmt = await db.prepare('SELECT * FROM brands WHERE id = ?');
    const brand = await brandStmt.get(id);
    res.json(brand);
  } catch (error) {
    console.error('Error updating brand:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Brand with this name or slug already exists' });
    }
    res.status(500).json({ error: 'Failed to update brand' });
  }
});

// DELETE brand
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if brand is used in products
    const productsStmt = await db.prepare('SELECT COUNT(*) as count FROM products WHERE brand_id = ?');
    const products = await productsStmt.get(id);
    
    if (products.count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete brand. It is used by ${products.count} product(s). Please remove or reassign products first.` 
      });
    }

    const deleteStmt = await db.prepare('DELETE FROM brands WHERE id = ?');
    await deleteStmt.run(id);
    res.json({ message: 'Brand deleted successfully' });
  } catch (error) {
    console.error('Error deleting brand:', error);
    res.status(500).json({ error: 'Failed to delete brand' });
  }
});

module.exports = router;

