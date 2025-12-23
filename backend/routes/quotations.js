const express = require('express');
const { db } = require('../database');
const { generateQuotationPDF } = require('../services/pdfGenerator');

const router = express.Router();

// Generate unique quotation number
function generateQuotationNumber() {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  // Get the last quotation number for this month
  const lastQuotation = db.prepare(`
    SELECT quotation_number FROM quotations 
    WHERE quotation_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`QT-${year}${month}-%`);

  let sequence = 1;
  if (lastQuotation) {
    const lastSeq = parseInt(lastQuotation.quotation_number.split('-')[2]);
    sequence = lastSeq + 1;
  }

  return `QT-${year}${month}-${String(sequence).padStart(4, '0')}`;
}

// GET all quotations
router.get('/', (req, res) => {
  try {
    const { status, search, startDate, endDate } = req.query;
    let query = 'SELECT * FROM quotations';
    const params = [];
    const conditions = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (search) {
      conditions.push('(customer_name LIKE ? OR quotation_number LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    if (startDate) {
      conditions.push('date >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('date <= ?');
      params.push(endDate);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const quotations = db.prepare(query).all(...params);
    res.json(quotations);
  } catch (error) {
    console.error('Error fetching quotations:', error);
    res.status(500).json({ error: 'Failed to fetch quotations' });
  }
});

// GET single quotation with items
router.get('/:id', (req, res) => {
  try {
    const quotation = db.prepare('SELECT * FROM quotations WHERE id = ?').get(req.params.id);
    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const items = db.prepare(`
      SELECT * FROM quotation_items 
      WHERE quotation_id = ? 
      ORDER BY line_number
    `).all(req.params.id);

    res.json({ ...quotation, items });
  } catch (error) {
    console.error('Error fetching quotation:', error);
    res.status(500).json({ error: 'Failed to fetch quotation' });
  }
});

// POST create quotation
router.post('/', (req, res) => {
  try {
    const { 
      customer_name, 
      customer_address, 
      customer_phone,
      customer_email,
      date, 
      notes,
      status,
      items 
    } = req.body;

    if (!customer_name || !items || items.length === 0) {
      return res.status(400).json({ error: 'Customer name and at least one item are required' });
    }

    const quotation_number = generateQuotationNumber();

    // Calculate totals
    let total = 0;
    for (const item of items) {
      const lineTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unit_price) || 0);
      total += lineTotal;
    }

    // Get VAT rate from settings
    const vatRateSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('vat_rate');
    const vatRate = parseFloat(vatRateSetting?.value || 5) / 100;
    const vat = total * vatRate;
    const grand_total = total + vat;

    // Insert quotation
    const result = db.prepare(`
      INSERT INTO quotations (quotation_number, customer_name, customer_address, customer_phone, customer_email, date, total, vat, grand_total, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      quotation_number,
      customer_name,
      customer_address || '',
      customer_phone || '',
      customer_email || '',
      date || new Date().toISOString().split('T')[0],
      total,
      vat,
      grand_total,
      notes || '',
      status || 'draft'
    );

    const quotationId = result.lastInsertRowid;

    // Insert items
    const insertItem = db.prepare(`
      INSERT INTO quotation_items (quotation_id, product_id, line_number, ref_no, description, model_no, image_path, qty, unit_price, line_total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const lineTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unit_price) || 0);
      
      // Get image_path from product if not provided
      let imagePath = item.image_path || '';
      if (!imagePath && item.product_id) {
        const product = db.prepare('SELECT image_path FROM products WHERE id = ?').get(item.product_id);
        if (product && product.image_path) {
          imagePath = product.image_path;
        }
      }
      
      insertItem.run(
        quotationId,
        item.product_id || null,
        i + 1,
        item.ref_no || '',
        item.description || '',
        item.model_no || '',
        imagePath,
        parseInt(item.qty) || 1,
        parseFloat(item.unit_price) || 0,
        lineTotal
      );
    }

    const quotation = db.prepare('SELECT * FROM quotations WHERE id = ?').get(quotationId);
    const savedItems = db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY line_number').all(quotationId);

    res.status(201).json({ ...quotation, items: savedItems });
  } catch (error) {
    console.error('Error creating quotation:', error);
    res.status(500).json({ error: 'Failed to create quotation' });
  }
});

// PUT update quotation
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { 
      customer_name, 
      customer_address, 
      customer_phone,
      customer_email,
      date, 
      notes,
      status,
      items 
    } = req.body;

    const existing = db.prepare('SELECT * FROM quotations WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    // Calculate totals
    let total = 0;
    for (const item of items || []) {
      const lineTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unit_price) || 0);
      total += lineTotal;
    }

    const vatRateSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('vat_rate');
    const vatRate = parseFloat(vatRateSetting?.value || 5) / 100;
    const vat = total * vatRate;
    const grand_total = total + vat;

    // Update quotation
    db.prepare(`
      UPDATE quotations 
      SET customer_name = ?, customer_address = ?, customer_phone = ?, customer_email = ?,
          date = ?, total = ?, vat = ?, grand_total = ?, notes = ?, status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      customer_name,
      customer_address || '',
      customer_phone || '',
      customer_email || '',
      date || existing.date,
      total,
      vat,
      grand_total,
      notes || '',
      status || existing.status,
      id
    );

    // Delete existing items and re-insert
    if (items && items.length > 0) {
      db.prepare('DELETE FROM quotation_items WHERE quotation_id = ?').run(id);

      const insertItem = db.prepare(`
        INSERT INTO quotation_items (quotation_id, product_id, line_number, ref_no, description, model_no, image_path, qty, unit_price, line_total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const lineTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unit_price) || 0);
        
        // Get image_path from product if not provided
        let imagePath = item.image_path || '';
        if (!imagePath && item.product_id) {
          const product = db.prepare('SELECT image_path FROM products WHERE id = ?').get(item.product_id);
          if (product && product.image_path) {
            imagePath = product.image_path;
          }
        }
        
        insertItem.run(
          id,
          item.product_id || null,
          i + 1,
          item.ref_no || '',
          item.description || '',
          item.model_no || '',
          imagePath,
          parseInt(item.qty) || 1,
          parseFloat(item.unit_price) || 0,
          lineTotal
        );
      }
    }

    const quotation = db.prepare('SELECT * FROM quotations WHERE id = ?').get(id);
    const savedItems = db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY line_number').all(id);

    res.json({ ...quotation, items: savedItems });
  } catch (error) {
    console.error('Error updating quotation:', error);
    res.status(500).json({ error: 'Failed to update quotation' });
  }
});

// DELETE quotation
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM quotations WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    db.prepare('DELETE FROM quotations WHERE id = ?').run(id);
    res.json({ message: 'Quotation deleted successfully' });
  } catch (error) {
    console.error('Error deleting quotation:', error);
    res.status(500).json({ error: 'Failed to delete quotation' });
  }
});

// GET quotation PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const quotation = db.prepare('SELECT * FROM quotations WHERE id = ?').get(req.params.id);
    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const items = db.prepare(`
      SELECT * FROM quotation_items 
      WHERE quotation_id = ? 
      ORDER BY line_number
    `).all(req.params.id);

    // Get settings
    const settingsRows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const row of settingsRows) {
      settings[row.key] = row.value;
    }

    const pdfBuffer = await generateQuotationPDF({ ...quotation, items }, settings);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Quotation-${quotation.quotation_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// GET next quotation number (for preview)
router.get('/meta/next-number', (req, res) => {
  try {
    const nextNumber = generateQuotationNumber();
    res.json({ quotation_number: nextNumber });
  } catch (error) {
    console.error('Error generating quotation number:', error);
    res.status(500).json({ error: 'Failed to generate quotation number' });
  }
});

module.exports = router;

