const PdfPrinter = require('pdfmake');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

// Helper function to get image from database via API endpoint
async function getImageFromApiEndpoint(apiPath) {
  try {
    // Extract product ID from path like /api/images/product/123
    const match = apiPath.match(/\/api\/images\/product\/(\d+)/);
    if (!match) return null;
    
    const productId = match[1];
    
    // Get database connection
    const { getDb } = require('../database');
    const db = getDb();
    if (!db) return null;
    
    // Fetch image from database
    const stmt = await db.prepare('SELECT image_data, image_mime_type FROM products WHERE id = ?');
    const product = await stmt.get(productId);
    
    if (product && product.image_data) {
      const mimeType = product.image_mime_type || 'image/png';
      const imageType = mimeType.split('/')[1] || 'png';
      
      // Handle Buffer (PostgreSQL BYTEA) or already base64 string
      let base64;
      if (Buffer.isBuffer(product.image_data)) {
        base64 = product.image_data.toString('base64');
      } else if (typeof product.image_data === 'string') {
        // If it's already base64, use it directly
        base64 = product.image_data;
      } else {
        // Try to convert to Buffer first
        const buffer = Buffer.from(product.image_data);
        base64 = buffer.toString('base64');
      }
      
      return `data:image/${imageType};base64,${base64}`;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching image from database:', error.message);
    return null;
  }
}

// Define fonts - use built-in pdfmake fonts
let fonts = {};

// Try to find pdfmake's built-in fonts
try {
  const pdfMakePath = require.resolve('pdfmake');
  const pdfMakeDir = path.dirname(pdfMakePath);
  const fontsDir = path.join(pdfMakeDir, 'fonts', 'Roboto');
  
  if (fs.existsSync(path.join(fontsDir, 'Roboto-Regular.ttf'))) {
    fonts = {
      Roboto: {
        normal: path.join(fontsDir, 'Roboto-Regular.ttf'),
        bold: path.join(fontsDir, 'Roboto-Medium.ttf'),
        italics: path.join(fontsDir, 'Roboto-Italic.ttf'),
        bolditalics: path.join(fontsDir, 'Roboto-MediumItalic.ttf')
      }
    };
  } else {
    throw new Error('Roboto fonts not found in pdfmake');
  }
} catch (error) {
  const customFontsDir = path.join(__dirname, '../fonts');
  
  if (fs.existsSync(path.join(customFontsDir, 'Roboto-Regular.ttf'))) {
    fonts = {
      Roboto: {
        normal: path.join(customFontsDir, 'Roboto-Regular.ttf'),
        bold: path.join(customFontsDir, 'Roboto-Medium.ttf'),
        italics: path.join(customFontsDir, 'Roboto-Italic.ttf'),
        bolditalics: path.join(customFontsDir, 'Roboto-MediumItalic.ttf')
      }
    };
  } else {
    fonts = {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };
  }
}

const printer = new PdfPrinter(fonts);

// Helper function to fetch image from URL and convert to base64
function fetchImageBase64(url) {
  return new Promise((resolve, reject) => {
    if (!url || !url.startsWith('http')) {
      resolve(null);
      return;
    }

    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        resolve(null);
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        try {
          const imageBuffer = Buffer.concat(chunks);
          const contentType = response.headers['content-type'] || 'image/png';
          const mimeType = contentType.split('/')[1] || 'png';
          const base64 = imageBuffer.toString('base64');
          resolve(`data:image/${mimeType};base64,${base64}`);
        } catch (error) {
          console.error('Error processing image from URL:', url, error.message);
          resolve(null);
        }
      });
    }).on('error', (error) => {
      console.error('Error fetching image from URL:', url, error.message);
      resolve(null);
    }).setTimeout(5000, () => {
      resolve(null); // Timeout after 5 seconds
    });
  });
}

// Helper function to convert image to base64 for PDF
function getImageBase64(imagePath) {
  try {
    if (!imagePath) return null;
    
    // Handle HTTP/HTTPS URLs
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      // This will be handled asynchronously, return null for now and handle in async context
      return null;
    }
    
    // Handle relative paths
    let fullPath = imagePath;
    if (imagePath.startsWith('/uploads')) {
      fullPath = path.join(__dirname, '..', imagePath);
    } else if (!path.isAbsolute(imagePath)) {
      fullPath = path.join(__dirname, '..', imagePath);
    }
    
    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const imageBuffer = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase().replace('.', '');
    const mimeType = ext === 'jpg' ? 'jpeg' : ext;
    return 'data:image/' + mimeType + ';base64,' + imageBuffer.toString('base64');
  } catch (error) {
    console.error('Error loading image:', imagePath, error.message);
    return null;
  }
}

// Country code mapping for flag URLs
const countryCodeMap = {
  'united states': 'us',
  'france': 'fr',
  'germany': 'de',
  'italy': 'it',
  'spain': 'es',
  'united kingdom': 'gb',
  'japan': 'jp',
  'china': 'cn',
  'south korea': 'kr',
  'canada': 'ca',
  'australia': 'au',
  'netherlands': 'nl',
  'belgium': 'be',
  'switzerland': 'ch',
  'sweden': 'se',
  'norway': 'no',
  'denmark': 'dk',
  'finland': 'fi',
  'poland': 'pl',
  'austria': 'at',
  'portugal': 'pt',
  'greece': 'gr',
  'turkey': 'tr',
  'india': 'in',
  'brazil': 'br',
  'mexico': 'mx',
  'argentina': 'ar',
  'south africa': 'za',
  'egypt': 'eg',
  'saudi arabia': 'sa',
  'uae': 'ae',
  'united arab emirates': 'ae',
  'kuwait': 'kw',
  'qatar': 'qa',
  'bahrain': 'bh',
  'oman': 'om',
  'jordan': 'jo',
  'lebanon': 'lb',
  'singapore': 'sg',
  'malaysia': 'my',
  'thailand': 'th',
  'indonesia': 'id',
  'philippines': 'ph',
  'vietnam': 'vn',
  'new zealand': 'nz',
  'ireland': 'ie',
  'israel': 'il',
  'czech republic': 'cz',
  'hungary': 'hu',
  'romania': 'ro',
  'russia': 'ru',
  'ukraine': 'ua',
};

function getCountryCode(countryName) {
  if (!countryName) return null;
  const normalized = countryName.toLowerCase().trim();
  return countryCodeMap[normalized] || null;
}

// Format currency
function formatCurrency(amount, currency) {
  currency = currency || 'AED';
  return currency + ' ' + parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

async function generateQuotationPDF(quotation, settings) {
  const currency = quotation.currency || settings.currency || 'AED';
  const vatRate = parseFloat(quotation.vat_rate || settings.vat_rate || 5);

  // Build header content
  // Try to load company logo (settings.company_logo is a path like /uploads/logo/logo.png)
  // If settings.company_logo is provided (e.g. "/uploads/logo/logo.png"), use it.
  // Otherwise use the bundled backend logo file next to the service.
  let logoPath;
  if (settings && settings.company_logo) {
    logoPath = settings.company_logo;
  } else {
    // Absolute path to backend/logo/horecahost_logo_new.png
    logoPath = path.join(__dirname, '..', 'logo', 'horecahost_logo_new.png');
  }
  const logoBase64 = getImageBase64(logoPath);

  const headerContent = [];
  
  // Company info row (left) and Quotation meta (right)
  headerContent.push({
    columns: [
      {
        width: '*',
        stack: [
          // Insert logo if available
          ...(logoBase64 ? [{ image: logoBase64, width: 90, alignment: 'left', margin: [0, 0, 0, 6] }] : []),
          { text: settings.company_name || 'Horeca Host', style: 'companyName', lineHeight: 1.1 },
          { text: settings.company_address || 'Dubai, U.A.E', style: 'companyInfo', margin: [0, 1, 0, 0], lineHeight: 1.1 },
          { text: (settings.company_phone ? 'Tel: ' + settings.company_phone : ''), style: 'companyInfo', margin: [0, 0.5, 0, 0], lineHeight: 1.1 },
          { text: (settings.company_email ? 'Email: ' + settings.company_email : ''), style: 'companyInfo', margin: [0, 0.5, 0, 0], lineHeight: 1.1 }
        ]
      },
      {
        width: 'auto',
        stack: [
          { text: 'QUOTATION', style: 'quotationTitle', alignment: 'right', lineHeight: 1.1 },
          { text: quotation.quotation_number || '', style: 'quotationNumber', alignment: 'right', margin: [0, 1, 0, 0], lineHeight: 1.1 },
          { text: 'Date: ' + formatDate(quotation.date), style: 'quotationDate', alignment: 'right', margin: [0, 2, 0, 0], lineHeight: 1.1 }
        ]
      }
    ],
    margin: [0, 0, 0, 5]
  });

  // Customer info box - Use simple stack with border instead of nested table
  const customerStack = [
    { text: 'Bill To', style: 'sectionLabel', margin: [0, 0, 0, 2] },
    { text: quotation.customer_name || '', style: 'customerName', margin: [0, 0.5, 0, 0] }
  ];
  
  if (quotation.customer_address) {
    customerStack.push({ text: quotation.customer_address, style: 'customerInfo', margin: [0, 0.5, 0, 0] });
  }
  if (quotation.customer_phone) {
    customerStack.push({ text: quotation.customer_phone, style: 'customerInfo', margin: [0, 0.5, 0, 0] });
  }
  if (quotation.customer_email) {
    customerStack.push({ text: quotation.customer_email, style: 'customerInfo', margin: [0, 0.5, 0, 0] });
  }

  // Use simple stack with border instead of nested table to avoid layout issues
  headerContent.push({
    stack: customerStack,
    border: [true, true, true, true],
    borderColor: '#e2e8f0',
    fillColor: '#f8fafc',
    margin: [0, 0, 0, 5]
  });

  // Build items table - Column order: No. | Item Description | Image | Model No. | Qty | Unit Price | Total
  const itemsTableBody = [
    [
      { text: 'No.', style: 'tableHeader', alignment: 'center' },
      { text: 'Item Description', style: 'tableHeader', alignment: 'left' },
      { text: 'Image', style: 'tableHeader', alignment: 'center' },
      { text: 'Model No.', style: 'tableHeader', alignment: 'center' },
      { text: 'Qty', style: 'tableHeader', alignment: 'center' },
      { text: 'Unit Price', style: 'tableHeader', alignment: 'right' },
      { text: 'Total', style: 'tableHeader', alignment: 'right' }
    ]
  ];

  const items = quotation.items || [];
  console.log('PDF DEBUG: quotation.items =', items ? items.length : 0, 'items');
  console.log('PDF DEBUG: quotation object keys =', Object.keys(quotation));
  
  const flagImagePromises = [];
  const productImagePromises = [];
  
  if (items.length === 0) {
    console.error('ERROR: No items in quotation!');
    console.error('Quotation data:', JSON.stringify(quotation, null, 2).substring(0, 500));
  }
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const lineNumber = item.line_number || (i + 1);
    const lineTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unit_price) || 0);
    
    // Try to get product image - handle both local files and HTTP/HTTPS URLs
    let imageCell = { text: '-', alignment: 'center', color: '#94a3b8', fontSize: 8 };
    
    if (item.image_path) {
      // Check if it's an API endpoint, HTTP/HTTPS URL, or local file
      if (item.image_path.startsWith('/api/images/product/')) {
        // API endpoint - store promise for async fetching from database
        productImagePromises.push({
          index: i,
          url: item.image_path
        });
        // Placeholder will be replaced after async fetch
        imageCell = { text: '...', alignment: 'center', color: '#94a3b8', fontSize: 8 };
      } else if (item.image_path.startsWith('http://') || item.image_path.startsWith('https://')) {
        // HTTP/HTTPS URL - store promise for async fetching
        productImagePromises.push({
          index: i,
          url: item.image_path
        });
        // Placeholder will be replaced after async fetch
        imageCell = { text: '...', alignment: 'center', color: '#94a3b8', fontSize: 8 };
      } else {
        // Local file path - try to load synchronously
        const imageBase64 = getImageBase64(item.image_path);
        if (imageBase64) {
          imageCell = { 
            image: imageBase64, 
            width: 40, 
            height: 40, 
            alignment: 'center',
            fit: [40, 40]
          };
        }
      }
    }
    
    // Build description with brand and country flag at bottom
    const descriptionStack = [];
    
    // Add full description (preserve line breaks, justify text)
    if (item.description) {
      // Split by newlines and add each line
      const descLines = item.description.split('\n');
      descLines.forEach((line, idx) => {
        if (line.trim()) {
          descriptionStack.push({ 
            text: line.trim(), 
            fontSize: 9,
            alignment: 'left',
            margin: [0, idx === 0 ? 0 : 1.5, 0, idx === descLines.length - 1 ? 2 : 0],
            lineHeight: 1.2
          });
        }
      });
    }
    
    // Add brand and country flag at bottom
    if (item.brand_name_en || item.brand_country_en) {
      // Build brand text
      const brandTextParts = [];
      if (item.brand_name_en) {
        brandTextParts.push(item.brand_name_en);
      }
      if (item.brand_country_en) {
        brandTextParts.push(`(${item.brand_country_en})`);
      }
      
      if (brandTextParts.length > 0) {
        const brandText = brandTextParts.join(' ');
        
        // Try to get flag image URL
        let flagImageUrl = null;
        if (item.brand_flag_image) {
          flagImageUrl = item.brand_flag_image;
        } else if (item.brand_country_en) {
          const countryCode = getCountryCode(item.brand_country_en);
          if (countryCode) {
            flagImageUrl = `https://flagcdn.com/w20/${countryCode}.png`;
          }
        }
        
        // Store flag URL for async fetching
        if (flagImageUrl) {
          flagImagePromises.push({
            index: i,
            url: flagImageUrl,
            brandText: brandText
          });
        }
        
        // For now, add text only - flag will be added after async fetch
        descriptionStack.push({
          text: brandText,
          fontSize: 7,
          color: '#64748b',
          italics: true,
            margin: [0, 3, 0, 0]
          });
      }
    }
    
    // Ensure description stack is never empty
    if (descriptionStack.length === 0) {
      descriptionStack.push({ text: '-', fontSize: 9 });
    }
    
    itemsTableBody.push([
      { text: String(lineNumber), alignment: 'center', fontSize: 9 },
      { 
        stack: descriptionStack,
        alignment: 'left'
      },
      imageCell,
      { text: item.model_no || '-', alignment: 'center', fontSize: 9 },
      { text: String(item.qty || 1), alignment: 'center', bold: true, fontSize: 9 },
      { text: formatCurrency(item.unit_price, currency), alignment: 'right', fontSize: 9 },
      { text: formatCurrency(item.line_total || lineTotal, currency), alignment: 'right', bold: true, fontSize: 9 }
    ]);
  }

  // Fetch all flag images and product images asynchronously
  const flagImages = {};
  const productImages = {};
  
  // Fetch flag images
  if (flagImagePromises.length > 0) {
    await Promise.all(
      flagImagePromises.map(async (promise) => {
        const base64 = await fetchImageBase64(promise.url);
        if (base64) {
          flagImages[promise.index] = {
            image: base64,
            brandText: promise.brandText
          };
        }
      })
    );
  }
  
  // Fetch product images
  if (productImagePromises.length > 0) {
    await Promise.all(
      productImagePromises.map(async (promise) => {
        let imageBase64 = null;
        
        // Handle API endpoint URLs - fetch directly from database
        if (promise.url.startsWith('/api/images/product/')) {
          imageBase64 = await getImageFromApiEndpoint(promise.url);
        } else if (promise.url.startsWith('http://') || promise.url.startsWith('https://')) {
          // Handle HTTP/HTTPS URLs
          imageBase64 = await fetchImageBase64(promise.url);
        } else {
          // Handle local file paths
          imageBase64 = getImageBase64(promise.url);
        }
        
        if (imageBase64) {
          productImages[promise.index] = imageBase64;
        }
      })
    );
  }
  
  // Update description stacks with flag images and product images
  for (let i = 0; i < itemsTableBody.length; i++) {
    if (i === 0) continue; // Skip header row
    const rowIndex = i - 1; // Adjust for header (items start at index 0)
    
    // Update product images
    if (productImages[rowIndex]) {
      itemsTableBody[i][2] = { // Image is 3rd column (index 2)
        image: productImages[rowIndex],
        width: 40,
        height: 40,
        alignment: 'center',
        fit: [40, 40]
      };
    }
    
    // Update flag images in description
    if (flagImages[rowIndex]) {
      const descCell = itemsTableBody[i][1]; // Description is 2nd column (index 1)
      if (descCell && descCell.stack && Array.isArray(descCell.stack)) {
        // Find the brand text entry and replace with image + text
        const brandIndex = descCell.stack.findIndex(s => 
          s.text && s.text.includes(flagImages[rowIndex].brandText)
        );
        if (brandIndex !== -1) {
          descCell.stack[brandIndex] = {
            columns: [
              { 
                image: flagImages[rowIndex].image, 
                width: 12, 
                height: 8,
                margin: [0, 2, 3, 0]
              },
              { 
                text: flagImages[rowIndex].brandText, 
                fontSize: 7, 
                color: '#64748b',
                italics: true
              }
            ],
            margin: [0, 4, 0, 0]
          };
        }
      }
    }
  }

  // Totals section
  const totalsTable = {
    table: {
      widths: ['*', 100],
      body: [
        [
          { text: 'Subtotal:', alignment: 'right', margin: [0, 6, 12, 6], color: '#4a5568', fontSize: 10 },
          { text: formatCurrency(quotation.total, currency), alignment: 'right', margin: [0, 6, 8, 6], bold: true }
        ],
        [
          { text: 'VAT (' + vatRate + '%):', alignment: 'right', margin: [0, 6, 12, 6], color: '#4a5568', fontSize: 10 },
          { text: formatCurrency(quotation.vat, currency), alignment: 'right', margin: [0, 6, 8, 6], bold: true }
        ],
        [
          { text: 'Grand Total:', alignment: 'right', fillColor: '#1e40af', color: '#ffffff', bold: true, margin: [0, 10, 12, 10] },
          { text: formatCurrency(quotation.grand_total, currency), alignment: 'right', fillColor: '#1e40af', color: '#ffffff', bold: true, fontSize: 12, margin: [0, 10, 8, 10] }
        ]
      ]
    },
    layout: {
      hLineWidth: function(i, node) { return i === node.table.body.length - 1 ? 0 : 1; },
      vLineWidth: function() { return 0; },
      hLineColor: function() { return '#e2e8f0'; }
    },
    margin: [280, 8, 0, 8]
  };

  // Terms & Conditions Section
  const termsSection = [];
  
  // Terms & Conditions (Main section) - Start on new page
  if (settings.terms_conditions) {
    termsSection.push(
      { text: 'Terms & Conditions', style: 'sectionTitle', margin: [0, 0, 0, 6], pageBreak: 'before' },
      { text: settings.terms_conditions, style: 'termsText', margin: [0, 0, 0, 8] }
    );
  } else if (settings.sales_terms) {
    // Fallback to sales_terms if terms_conditions not available
    termsSection.push(
      { text: 'Terms & Conditions', style: 'sectionTitle', margin: [0, 0, 0, 6], pageBreak: 'before' },
      { text: settings.sales_terms, style: 'termsText', margin: [0, 0, 0, 8] }
    );
  }

  // Delivery & Warranty section - combine quotation.delivery and quotation.payment
  const deliveryWarrantyParts = [];
  if (quotation.delivery) {
    deliveryWarrantyParts.push('Delivery: ' + quotation.delivery);
  }
  if (quotation.payment) {
    deliveryWarrantyParts.push('Warranty: ' + quotation.payment);
  }
  
  // If no quotation-specific delivery/payment, use settings
  if (deliveryWarrantyParts.length === 0 && settings.delivery_warranty) {
    deliveryWarrantyParts.push(settings.delivery_warranty);
  }
  
  // If we have delivery/payment info from either source, add the section
  if (deliveryWarrantyParts.length > 0) {
    termsSection.push(
      { text: 'Delivery & Warranty', style: 'sectionTitle', margin: [0, 0, 0, 6] },
      { text: deliveryWarrantyParts.join('\n'), style: 'termsText', margin: [0, 0, 0, 8] }
    );
  }

  // Signature section with manager details
  const managerName = settings.company_manager || 'General Manager';
  const signatureSection = {
    columns: [
      {
        width: '50%',
        stack: [
          { text: 'For ' + (settings.company_name || 'Horeca Host'), fontSize: 10, bold: true, margin: [0, 0, 0, 6] },
          { text: managerName, fontSize: 9, color: '#64748b', margin: [0, 0, 0, 20] },
          { text: '____________________________', fontSize: 10, color: '#cbd5e1' },
          { text: 'Authorized Signature', style: 'signatureLabel', margin: [0, 6, 0, 0] }
        ]
      },
      {
        width: '50%',
        stack: [
          { text: 'Customer Acceptance', fontSize: 10, bold: true, margin: [0, 0, 0, 20] },
          { text: '____________________________', fontSize: 10, color: '#cbd5e1' },
          { text: 'Signature & Date', style: 'signatureLabel', margin: [0, 6, 0, 0] }
        ]
      }
    ],
    margin: [0, 10, 0, 0]
  };

  // CRITICAL: Validate items table structure before building document
  if (!itemsTableBody || !Array.isArray(itemsTableBody)) {
    console.error('CRITICAL ERROR: itemsTableBody is not an array!', typeof itemsTableBody);
    throw new Error('Invalid table structure: itemsTableBody is not an array');
  }
  
  if (itemsTableBody.length < 2) {
    console.error('CRITICAL ERROR: itemsTableBody has less than 2 rows!');
    console.error('- Rows:', itemsTableBody.length);
    console.error('- Items count:', items.length);
    throw new Error(`Cannot generate PDF: quotation has no items. Table has only ${itemsTableBody.length} row(s)`);
  }

  // Validate each row has exactly 7 columns
  const expectedColumns = 7;
  for (let i = 0; i < itemsTableBody.length; i++) {
    if (!Array.isArray(itemsTableBody[i])) {
      console.error(`CRITICAL ERROR: Row ${i} is not an array!`, typeof itemsTableBody[i]);
      throw new Error(`Invalid table row ${i}: not an array`);
    }
    if (itemsTableBody[i].length !== expectedColumns) {
      console.error(`CRITICAL ERROR: Row ${i} has ${itemsTableBody[i].length} columns, expected ${expectedColumns}`);
      console.error('Row content preview:', JSON.stringify(itemsTableBody[i]).substring(0, 200));
      throw new Error(`Invalid table row ${i}: expected ${expectedColumns} columns, got ${itemsTableBody[i].length}`);
    }
  }

  console.log('✅ PDF Table Validation: PASSED');
  console.log(`   - Table has ${itemsTableBody.length} rows (1 header + ${itemsTableBody.length - 1} items)`);
  console.log(`   - All rows have ${expectedColumns} columns`);

  // Build document definition with validated table
  // Use itemsTableBody directly - it's already validated
  console.log('📋 Building PDF document:');
  console.log(`   - Table rows: ${itemsTableBody.length}`);
  console.log(`   - Header columns: ${itemsTableBody[0] ? itemsTableBody[0].length : 0}`);
  if (itemsTableBody.length > 1) {
    console.log(`   - First item row columns: ${itemsTableBody[1].length}`);
    // Log first item structure
    const firstItemRow = itemsTableBody[1];
    console.log(`   - First item cell types:`, firstItemRow.map((cell, idx) => {
      if (cell && cell.text) return `col${idx}:text`;
      if (cell && cell.stack) return `col${idx}:stack`;
      if (cell && cell.image) return `col${idx}:image`;
      return `col${idx}:${cell ? typeof cell : 'null'}`;
    }).join(', '));
  }
  
  // Final validation - ensure all cells are valid objects
  for (let i = 0; i < itemsTableBody.length; i++) {
    const row = itemsTableBody[i];
    if (!Array.isArray(row)) {
      throw new Error(`Table row ${i} is not an array`);
    }
    if (row.length !== 7) {
      throw new Error(`Table row ${i} has ${row.length} columns, expected 7`);
    }
    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (!cell || (typeof cell !== 'object')) {
        throw new Error(`Table cell [${i}][${j}] is invalid: ${typeof cell}`);
      }
      // Ensure cell has at least one valid property
      if (!cell.text && !cell.stack && !cell.image && !cell.columns) {
        throw new Error(`Table cell [${i}][${j}] has no valid content (text/stack/image/columns)`);
      }
    }
  }
  console.log('✅ All table cells validated');
  
  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [25, 20, 25, 30],
    compress: true,
    content: [
      ...headerContent,
      {
        table: {
          headerRows: 1,
          widths: [25, '*', 50, 60, 30, 70, 75],
          body: itemsTableBody,
          dontBreakRows: true
          // Removed keepWithHeaderRows to prevent table being pushed to next page
        },
        layout: {
          paddingLeft: function() { return 3; },
          paddingRight: function() { return 3; },
          paddingTop: function(i, node) { return i === 0 ? 4 : 2; }, // Reduced padding
          paddingBottom: function(i, node) { return i === 0 ? 4 : 2; }, // Reduced padding
          defaultBorder: true,  // Set to true to enable borders - allows vLineWidth/vLineColor to work
          hLineWidth: function(i, node) { 
            if (i === 0 || i === node.table.body.length) return 1;  // Top and bottom borders
            if (i === 1) return 1.5;  // Below header - thicker
            return 0.5;  // Other rows
          },
          // FIX: vLineWidth must return 1 for all vertical lines (including edges)
          // For 7 columns, there are 8 vertical lines (left edge + 6 between columns + right edge)
          vLineWidth: function(i, node) { 
            // Always return 1 for all vertical lines - ensures column separators are visible
            return 1;
          },
          hLineColor: function(i) { 
            if (i === 1) return '#1e40af';  // Header separator - blue
            return '#cbd5e1';  // Other lines - gray
          },
          // FIX: vLineColor must return black for all vertical lines to partition columns
          vLineColor: function(i, node) { 
            // Pure black for all vertical lines - clear column separation
            return '#000000';  // Black
          },
          fillColor: function(rowIndex) { 
            return rowIndex === 0 ? '#f1f5f9' : null;  // Header background
          }
        },
        margin: [0, 0, 0, 5]
      },
      { text: '', margin: [0, 3, 0, 0] }, // Spacing before totals
      totalsTable,
      { text: '', margin: [0, 3, 0, 0] }, // Spacing before terms
      ...termsSection,
      { text: '', margin: [0, 5, 0, 0] }, // Spacing before signature
      signatureSection
    ],
    styles: {
      companyName: { fontSize: 16, bold: true, color: '#1e3a5f', lineHeight: 1.1 },
      companyInfo: { fontSize: 9, color: '#64748b', alignment: 'left', lineHeight: 1.1 },
      quotationTitle: { fontSize: 22, bold: true, color: '#1e3a5f' },
      quotationNumber: { fontSize: 11, color: '#64748b' },
      quotationDate: { fontSize: 10, color: '#64748b' },
      sectionLabel: { fontSize: 9, bold: true, color: '#1e3a5f' },
      customerName: { fontSize: 12, bold: true, color: '#1e293b' },
      customerInfo: { fontSize: 10, color: '#64748b' },
      tableHeader: { fontSize: 9, bold: true, color: '#1e3a5f' },
      sectionTitle: { fontSize: 10, bold: true, color: '#1e3a5f' },
      termsText: { fontSize: 8, color: '#64748b', lineHeight: 1.4, alignment: 'justify' },
      vatNote: { fontSize: 8, color: '#64748b', italics: true, lineHeight: 1.4, alignment: 'justify' },
      quotationMessage: { fontSize: 9, color: '#1e293b', lineHeight: 1.5, alignment: 'justify' },
      signatureLabel: { fontSize: 9, color: '#94a3b8' }
    },
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
      color: '#374151',
      lineHeight: 1.2
    },
    footer: function(currentPage, pageCount) {
      return {
        text: 'Page ' + currentPage + ' of ' + pageCount,
        alignment: 'center',
        fontSize: 8,
        color: '#94a3b8',
        margin: [30, 5, 30, 0]
      };
    }
  };

  return new Promise(function(resolve, reject) {
    try {
      // Validate document definition before creating PDF
      if (!docDefinition.content || !Array.isArray(docDefinition.content)) {
        throw new Error('Invalid PDF document definition: content is missing or not an array');
      }
      
      if (!itemsTableBody || itemsTableBody.length === 0) {
        console.error('ERROR: itemsTableBody is empty or undefined');
        console.error('Items count:', quotation.items ? quotation.items.length : 0);
        throw new Error('No items to include in PDF');
      }
      
      // Validate table structure
      if (itemsTableBody.length < 2) {
        console.error('ERROR: itemsTableBody only has header, no items');
        throw new Error('Quotation has no items');
      }
      
      // Validate each row has correct number of columns (should be 7)
      const expectedColumns = 7;
      for (let i = 0; i < itemsTableBody.length; i++) {
        if (!itemsTableBody[i] || !Array.isArray(itemsTableBody[i])) {
          console.error('ERROR: Row', i, 'is not an array');
          throw new Error(`Invalid table row structure at index ${i}`);
        }
        if (itemsTableBody[i].length !== expectedColumns) {
          console.error('ERROR: Row', i, 'has', itemsTableBody[i].length, 'columns, expected', expectedColumns);
          throw new Error(`Invalid table row: expected ${expectedColumns} columns, got ${itemsTableBody[i].length}`);
        }
      }
      
      // Log for debugging
      console.log('PDF Generation: itemsTableBody has', itemsTableBody.length, 'rows (1 header +', itemsTableBody.length - 1, 'items)');
      console.log('PDF Generation: First row (header) has', itemsTableBody[0].length, 'columns');
      
      // CRITICAL: Verify table is in content before PDF creation
      const tableInContent = docDefinition.content.find(item => item && item.table);
      if (!tableInContent) {
        console.error('❌ CRITICAL ERROR: Table not found in content array!');
        console.error('Content items types:', docDefinition.content.map((item, idx) => 
          `[${idx}] ${item.table ? 'TABLE' : item.text !== undefined ? 'TEXT' : item.columns ? 'COLUMNS' : typeof item}`
        ));
        console.error('Content array length:', docDefinition.content.length);
        throw new Error('Table is missing from PDF content array');
      }
      console.log('✅ Table verified in content array');
      
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks = [];
      
      pdfDoc.on('data', function(chunk) { 
        chunks.push(chunk); 
      });
      
      pdfDoc.on('end', function() { 
        if (chunks.length === 0) {
          reject(new Error('PDF generation produced no data'));
          return;
        }
        resolve(Buffer.concat(chunks)); 
      });
      
      pdfDoc.on('error', function(err) { 
        console.error('PDFKit error:', err);
        reject(err); 
      });
      
      pdfDoc.end();
    } catch (error) {
      console.error('PDF generation error:', error);
      console.error('Error stack:', error.stack);
      reject(error);
    }
  });
}

module.exports = { generateQuotationPDF };
