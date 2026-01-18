const express = require('express');
const { db } = require('../database');
const { generateQuotationPDF } = require('../services/pdfGenerator');

const router = express.Router();

// Generate unique quotation number
async function generateQuotationNumber() {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  // Get the last quotation number for this month
  const stmt = await db.prepare(`
    SELECT quotation_number FROM quotations 
    WHERE quotation_number LIKE ?
    ORDER BY id DESC LIMIT 1
  `);
  const lastQuotation = await stmt.get(`QT-${year}${month}-%`);

  let sequence = 1;
  if (lastQuotation) {
    const lastSeq = parseInt(lastQuotation.quotation_number.split('-')[2]);
    sequence = lastSeq + 1;
  }

  return `QT-${year}${month}-${String(sequence).padStart(4, '0')}`;
}

// GET all quotations with pagination
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      search, 
      startDate, 
      endDate,
      page = 1,
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100); // Max 100 per page
    const offset = (pageNum - 1) * limitNum;
    
    // Validate sortBy to prevent SQL injection
    const allowedSortColumns = ['created_at', 'date', 'quotation_number', 'customer_name', 'grand_total', 'status'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    // Build WHERE conditions
    const params = [];
    const conditions = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push('(customer_name ILIKE ? OR quotation_number ILIKE ?)');
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

    const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
    
    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM quotations${whereClause}`;
    const countStmt = await db.prepare(countQuery);
    const countResult = await countStmt.get(...params);
    const total = parseInt(countResult.total || 0);
    
    // Get paginated results - only select needed columns
    const dataQuery = `
      SELECT 
        id, quotation_number, customer_name, customer_email, 
        date, total, vat, grand_total, status, created_at, updated_at
      FROM quotations
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDir}
      LIMIT ? OFFSET ?
    `;
    
    const stmt = await db.prepare(dataQuery);
    const quotations = await stmt.all(...params, limitNum, offset);
    
    res.json({
      data: quotations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: offset + limitNum < total
      }
    });
  } catch (error) {
    console.error('Error fetching quotations:', error);
    res.status(500).json({ error: 'Failed to fetch quotations' });
  }
});

// GET single quotation with items
router.get('/:id', async (req, res) => {
  try {
    const stmt = await db.prepare('SELECT * FROM quotations WHERE id = ?');
    const quotation = await stmt.get(req.params.id);
    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const itemsStmt = await db.prepare(`
      SELECT 
        qi.*,
        b.name_en as brand_name_en,
        b.name_ar as brand_name_ar,
        b.country_en as brand_country_en,
        b.country_ar as brand_country_ar,
        b.flag_image as brand_flag_image
      FROM quotation_items qi
      LEFT JOIN products p ON qi.product_id = p.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE qi.quotation_id = ?
      ORDER BY qi.line_number
    `);
    const items = await itemsStmt.all(req.params.id);

    res.json({ ...quotation, items });
  } catch (error) {
    console.error('Error fetching quotation:', error);
    res.status(500).json({ error: 'Failed to fetch quotation' });
  }
});

// POST create quotation
router.post('/', async (req, res) => {
  try {
    const { 
      customer_name, 
      customer_address, 
      customer_phone,
      customer_email,
      date, 
      notes,
      delivery,
      payment,
      status,
      currency,
      vat_rate,
      items 
    } = req.body;

    if (!customer_name || !items || items.length === 0) {
      return res.status(400).json({ error: 'Customer name and at least one item are required' });
    }

    const quotation_number = await generateQuotationNumber();

    // Calculate totals
    let total = 0;
    for (const item of items) {
      const lineTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unit_price) || 0);
      total += lineTotal;
    }

    // Get VAT rate from request or settings
    let vatRateValue;
    if (vat_rate !== undefined) {
      vatRateValue = parseFloat(vat_rate);
    } else {
      const vatStmt = await db.prepare('SELECT value FROM settings WHERE key = ?');
      const vatRateSetting = await vatStmt.get('vat_rate');
      vatRateValue = parseFloat(vatRateSetting?.value || 5);
    }
    const vatRate = vatRateValue / 100;
    const vat = total * vatRate;
    const grand_total = total + vat;
    const quotationCurrency = currency || 'AED';

    // Insert quotation
    const insertStmt = await db.prepare(`
      INSERT INTO quotations (quotation_number, customer_name, customer_address, customer_phone, customer_email, date, total, vat, grand_total, notes, delivery, payment, status, currency, vat_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `);
    const result = await insertStmt.run(
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
      delivery || '',
      payment || '',
      status || 'draft',
      quotationCurrency,
      vatRateValue
    );

    const quotationId = result.insertId || result.lastInsertRowid;

    // Insert items
    const insertItemStmt = await db.prepare(`
      INSERT INTO quotation_items (quotation_id, product_id, line_number, ref_no, description, model_no, image_path, qty, unit_price, line_total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const lineTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unit_price) || 0);
      
      // Get image from product if not provided (products.images is JSONB array)
      let imagePath = item.image_path || '';
      if (!imagePath && item.product_id) {
        const productStmt = await db.prepare('SELECT images, name_en, name_ar, model, price FROM products WHERE id = ?');
        const product = await productStmt.get(item.product_id);
        if (product) {
          // Get first image from images array if available
          if (product.images) {
            try {
              const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
              if (Array.isArray(images) && images.length > 0) {
                imagePath = images[0];
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
          // Use product name and model for description if not provided
          if (!item.description) {
            item.description = product.name_en || product.name_ar || '';
          }
          if (!item.model_no && product.model) {
            item.model_no = product.model;
          }
          // Use product price if unit_price not provided
          if (!item.unit_price && product.price) {
            item.unit_price = product.price;
          }
        }
      }
      
      await insertItemStmt.run(
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

    const quotationStmt = await db.prepare('SELECT * FROM quotations WHERE id = ?');
    const quotation = await quotationStmt.get(quotationId);
    const itemsStmt = await db.prepare(`
      SELECT 
        qi.*,
        b.name_en as brand_name_en,
        b.name_ar as brand_name_ar,
        b.country_en as brand_country_en,
        b.country_ar as brand_country_ar,
        b.flag_image as brand_flag_image
      FROM quotation_items qi
      LEFT JOIN products p ON qi.product_id = p.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE qi.quotation_id = ?
      ORDER BY qi.line_number
    `);
    const savedItems = await itemsStmt.all(quotationId);

    res.status(201).json({ ...quotation, items: savedItems });
  } catch (error) {
    console.error('Error creating quotation:', error);
    res.status(500).json({ error: 'Failed to create quotation' });
  }
});

// PUT update quotation
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      customer_name, 
      customer_address, 
      customer_phone,
      customer_email,
      date, 
      notes,
      delivery,
      payment,
      status,
      currency,
      vat_rate,
      items 
    } = req.body;

    const existingStmt = await db.prepare('SELECT * FROM quotations WHERE id = ?');
    const existing = await existingStmt.get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    // Calculate totals
    let total = 0;
    for (const item of items || []) {
      const lineTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unit_price) || 0);
      total += lineTotal;
    }

    // Get VAT rate from request or existing or settings
    let vatRateValue;
    if (vat_rate !== undefined) {
      vatRateValue = parseFloat(vat_rate);
    } else if (existing.vat_rate) {
      vatRateValue = parseFloat(existing.vat_rate);
    } else {
      const vatStmt = await db.prepare('SELECT value FROM settings WHERE key = ?');
      const vatRateSetting = await vatStmt.get('vat_rate');
      vatRateValue = parseFloat(vatRateSetting?.value || 5);
    }
    const vatRate = vatRateValue / 100;
    const vat = total * vatRate;
    const grand_total = total + vat;
    const quotationCurrency = currency || existing.currency || 'AED';

    // Update quotation
    const updateStmt = await db.prepare(`
      UPDATE quotations 
      SET customer_name = ?, customer_address = ?, customer_phone = ?, customer_email = ?,
          date = ?, total = ?, vat = ?, grand_total = ?, notes = ?, delivery = ?, payment = ?,
          status = ?, currency = ?, vat_rate = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    await updateStmt.run(
      customer_name,
      customer_address || '',
      customer_phone || '',
      customer_email || '',
      date || existing.date,
      total,
      vat,
      grand_total,
      notes || '',
      delivery || '',
      payment || '',
      status || existing.status,
      quotationCurrency,
      vatRateValue,
      id
    );

    // Delete existing items and re-insert
    if (items && items.length > 0) {
      const deleteStmt = await db.prepare('DELETE FROM quotation_items WHERE quotation_id = ?');
      await deleteStmt.run(id);

      const insertItemStmt = await db.prepare(`
        INSERT INTO quotation_items (quotation_id, product_id, line_number, ref_no, description, model_no, image_path, qty, unit_price, line_total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const lineTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unit_price) || 0);
        
        // Get image from product if not provided (products.images is JSONB array)
        let imagePath = item.image_path || '';
        if (!imagePath && item.product_id) {
          const productStmt = await db.prepare('SELECT images, name_en, name_ar, model, price FROM products WHERE id = ?');
          const product = await productStmt.get(item.product_id);
          if (product) {
            // Get first image from images array if available
            if (product.images) {
              try {
                const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                if (Array.isArray(images) && images.length > 0) {
                  imagePath = images[0];
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
            // Use product name and model for description if not provided
            if (!item.description) {
              item.description = product.name_en || product.name_ar || '';
            }
            if (!item.model_no && product.model) {
              item.model_no = product.model;
            }
            // Use product price if unit_price not provided
            if (!item.unit_price && product.price) {
              item.unit_price = product.price;
            }
          }
        }
        
        await insertItemStmt.run(
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

    const quotationStmt = await db.prepare('SELECT * FROM quotations WHERE id = ?');
    const quotation = await quotationStmt.get(id);
    const itemsStmt = await db.prepare(`
      SELECT 
        qi.*,
        b.name_en as brand_name_en,
        b.name_ar as brand_name_ar,
        b.country_en as brand_country_en,
        b.country_ar as brand_country_ar,
        b.flag_image as brand_flag_image
      FROM quotation_items qi
      LEFT JOIN products p ON qi.product_id = p.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE qi.quotation_id = ?
      ORDER BY qi.line_number
    `);
    const savedItems = await itemsStmt.all(id);

    res.json({ ...quotation, items: savedItems });
  } catch (error) {
    console.error('Error updating quotation:', error);
    res.status(500).json({ error: 'Failed to update quotation' });
  }
});

// DELETE quotation
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingStmt = await db.prepare('SELECT * FROM quotations WHERE id = ?');
    const existing = await existingStmt.get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const deleteStmt = await db.prepare('DELETE FROM quotations WHERE id = ?');
    await deleteStmt.run(id);
    res.json({ message: 'Quotation deleted successfully' });
  } catch (error) {
    console.error('Error deleting quotation:', error);
    res.status(500).json({ error: 'Failed to delete quotation' });
  }
});

// GET quotation PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const stmt = await db.prepare('SELECT * FROM quotations WHERE id = ?');
    const quotation = await stmt.get(req.params.id);
    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const itemsStmt = await db.prepare(`
      SELECT 
        qi.*,
        b.name_en as brand_name_en,
        b.name_ar as brand_name_ar,
        b.country_en as brand_country_en,
        b.country_ar as brand_country_ar,
        b.flag_image as brand_flag_image
      FROM quotation_items qi
      LEFT JOIN products p ON qi.product_id = p.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE qi.quotation_id = ?
      ORDER BY qi.line_number
    `);
    const items = await itemsStmt.all(req.params.id);
    
    console.log('PDF Route: Fetched', items ? items.length : 0, 'items for quotation', req.params.id);
    if (items && items.length > 0) {
      console.log('PDF Route: First item:', JSON.stringify(items[0], null, 2).substring(0, 300));
    }

    // Get settings
    const settingsStmt = await db.prepare('SELECT key, value FROM settings');
    const settingsRows = await settingsStmt.all();
    const settings = {};
    for (const row of settingsRows) {
      settings[row.key] = row.value;
    }

    const quotationWithItems = { ...quotation, items };
    console.log('PDF Route: Passing quotation with', quotationWithItems.items ? quotationWithItems.items.length : 0, 'items to PDF generator');
    
    const pdfBuffer = await generateQuotationPDF(quotationWithItems, settings);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Quotation-${quotation.quotation_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    if (error.message) {
      console.error('❌ Detailed error:', JSON.stringify(error.message));
    }
    res.status(500).json({ 
      error: 'Failed to generate PDF',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET next quotation number (for preview)
router.get('/meta/next-number', async (req, res) => {
  try {
    const nextNumber = await generateQuotationNumber();
    res.json({ quotation_number: nextNumber });
  } catch (error) {
    console.error('Error generating quotation number:', error);
    res.status(500).json({ error: 'Failed to generate quotation number' });
  }
});

module.exports = router;
