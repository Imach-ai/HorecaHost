const PdfPrinter = require('pdfmake');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

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
  const headerContent = [];
  
  // Company info row
  headerContent.push({
    columns: [
      {
        width: '*',
        stack: [
          { text: settings.company_name || 'Horeca Host', style: 'companyName' },
          { text: settings.company_address || 'Dubai, U.A.E', style: 'companyInfo', margin: [0, 4, 0, 0] },
          { text: 'Tel: ' + (settings.company_phone || '') + (settings.company_mobile ? ' | Mobile: ' + settings.company_mobile : ''), style: 'companyInfo' },
          { text: 'Email: ' + (settings.company_email || ''), style: 'companyInfo' },
          { text: (settings.company_website ? 'Web: ' + settings.company_website : ''), style: 'companyInfo' },
          { text: settings.company_trn || '', style: 'companyInfo', margin: [0, 4, 0, 0] }
        ]
      },
      {
        width: 'auto',
        stack: [
          { text: 'QUOTATION', style: 'quotationTitle', alignment: 'right' },
          { text: quotation.quotation_number || '', style: 'quotationNumber', alignment: 'right', margin: [0, 4, 0, 0] },
          { text: 'Date: ' + formatDate(quotation.date), style: 'quotationDate', alignment: 'right', margin: [0, 8, 0, 0] }
        ]
      }
    ],
    margin: [0, 0, 0, 20]
  });

  // Customer info box
  const customerStack = [
    { text: 'BILL TO:', style: 'sectionLabel', margin: [0, 0, 0, 6] },
    { text: quotation.customer_name || '', style: 'customerName' }
  ];
  
  if (quotation.customer_address) {
    customerStack.push({ text: quotation.customer_address, style: 'customerInfo' });
  }
  if (quotation.customer_phone) {
    customerStack.push({ text: 'Tel: ' + quotation.customer_phone, style: 'customerInfo' });
  }
  if (quotation.customer_email) {
    customerStack.push({ text: 'Email: ' + quotation.customer_email, style: 'customerInfo' });
  }

  headerContent.push({
    table: {
      widths: ['*'],
      body: [[{
        stack: customerStack,
        margin: [12, 12, 12, 12],
        fillColor: '#f8fafc'
      }]]
    },
    layout: {
      hLineWidth: function() { return 1; },
      vLineWidth: function() { return 1; },
      hLineColor: function() { return '#e2e8f0'; },
      vLineColor: function() { return '#e2e8f0'; }
    },
    margin: [0, 0, 0, 20]
  });

  // Build items table - Column order: NO. | MODEL NO. | ITEM DESCRIPTION | IMAGE | QTY | UNIT PRICE | TOTAL
  const itemsTableBody = [
    [
      { text: 'NO.', style: 'tableHeader', alignment: 'center' },
      { text: 'MODEL NO.', style: 'tableHeader', alignment: 'center' },
      { text: 'ITEM DESCRIPTION', style: 'tableHeader', alignment: 'left' },
      { text: 'IMAGE', style: 'tableHeader', alignment: 'center' },
      { text: 'QTY', style: 'tableHeader', alignment: 'center' },
      { text: 'UNIT PRICE', style: 'tableHeader', alignment: 'right' },
      { text: 'TOTAL', style: 'tableHeader', alignment: 'right' }
    ]
  ];

  const items = quotation.items || [];
  const flagImagePromises = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const lineNumber = item.line_number || (i + 1);
    const lineTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unit_price) || 0);
    
    // Try to get image
    let imageCell = { text: '-', alignment: 'center', margin: [0, 8, 0, 8], color: '#94a3b8' };
    
    if (item.image_path) {
      const imageBase64 = getImageBase64(item.image_path);
      if (imageBase64) {
        imageCell = { 
          image: imageBase64, 
          width: 45, 
          height: 45, 
          alignment: 'center',
          margin: [0, 4, 0, 4]
        };
      }
    }
    
    // Build description with brand and country flag at bottom
    const descriptionStack = [];
    
    // Add full description (preserve line breaks)
    if (item.description) {
      // Split by newlines and add each line
      const descLines = item.description.split('\n');
      descLines.forEach((line, idx) => {
        if (line.trim()) {
          descriptionStack.push({ 
            text: line.trim(), 
            fontSize: 9,
            margin: [0, idx === 0 ? 0 : 2, 0, idx === descLines.length - 1 ? 4 : 0]
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
          margin: [0, 4, 0, 0]
        });
      }
    }
    
    // Ensure description stack is never empty
    if (descriptionStack.length === 0) {
      descriptionStack.push({ text: '-', fontSize: 9 });
    }
    
    itemsTableBody.push([
      { text: String(lineNumber), alignment: 'center', margin: [0, 12, 0, 12] },
      { text: item.model_no || '-', alignment: 'center', margin: [0, 12, 0, 12], fontSize: 9 },
      { 
        stack: descriptionStack,
        alignment: 'left', 
        margin: [6, 8, 6, 8]
      },
      imageCell,
      { text: String(item.qty || 1), alignment: 'center', margin: [0, 12, 0, 12], bold: true },
      { text: formatCurrency(item.unit_price, currency), alignment: 'right', margin: [0, 12, 6, 12], fontSize: 9 },
      { text: formatCurrency(item.line_total || lineTotal, currency), alignment: 'right', margin: [0, 12, 6, 12], bold: true, fontSize: 9 }
    ]);
  }

  // Fetch all flag images asynchronously and update description stacks
  if (flagImagePromises.length > 0) {
    const flagImages = {};
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
    
    // Update description stacks with flag images
    for (let i = 0; i < itemsTableBody.length; i++) {
      if (i === 0) continue; // Skip header row
      const rowIndex = i - 1; // Adjust for header (items start at index 0)
      if (flagImages[rowIndex]) {
        const descCell = itemsTableBody[i][2]; // Description is 3rd column (index 2)
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
  }

  // Totals section
  const totalsTable = {
    table: {
      widths: ['*', 100],
      body: [
        [
          { text: 'Subtotal:', alignment: 'right', margin: [0, 6, 12, 6], color: '#4a5568' },
          { text: formatCurrency(quotation.total, currency), alignment: 'right', margin: [0, 6, 8, 6], bold: true }
        ],
        [
          { text: 'VAT (' + vatRate + '%):', alignment: 'right', margin: [0, 6, 12, 6], color: '#4a5568' },
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
    margin: [280, 15, 0, 25]
  };

  // Sales Terms & Conditions Section
  const termsSection = [];
  
  // Sales Terms & Conditions (Main section)
  if (settings.sales_terms) {
    termsSection.push(
      { text: 'Sales Terms & Conditions:', style: 'sectionTitle', margin: [0, 20, 0, 8] },
      { text: settings.sales_terms, style: 'termsText', margin: [0, 0, 0, 12] }
    );
  }

  // VAT Note
  if (settings.vat_note) {
    termsSection.push(
      { text: settings.vat_note, style: 'vatNote', margin: [0, 0, 0, 15] }
    );
  }

  // Quotation Message (Professional closing message)
  if (settings.quotation_message) {
    termsSection.push(
      { text: settings.quotation_message, style: 'quotationMessage', margin: [0, 0, 0, 20] }
    );
  }

  // Additional Terms & Conditions (if exists)
  if (settings.terms_conditions) {
    termsSection.push(
      { text: 'Additional Terms & Conditions:', style: 'sectionTitle', margin: [0, 0, 0, 6] },
      { text: settings.terms_conditions, style: 'termsText', margin: [0, 0, 0, 15] }
    );
  }

  if (settings.delivery_warranty) {
    termsSection.push(
      { text: 'Delivery & Warranty:', style: 'sectionTitle', margin: [0, 0, 0, 6] },
      { text: settings.delivery_warranty, style: 'termsText', margin: [0, 0, 0, 15] }
    );
  }

  if (settings.bank_details) {
    termsSection.push(
      { text: 'Bank Details:', style: 'sectionTitle', margin: [0, 0, 0, 6] },
      { text: settings.bank_details, style: 'termsText', margin: [0, 0, 0, 15] }
    );
  }

  // Signature section with manager details
  const managerName = settings.company_manager || 'General Manager';
  const signatureSection = {
    columns: [
      {
        width: '50%',
        stack: [
          { text: 'For ' + (settings.company_name || 'Horeca Host'), fontSize: 10, bold: true, margin: [0, 40, 0, 8] },
          { text: managerName, fontSize: 9, color: '#64748b', margin: [0, 0, 0, 35] },
          { text: '____________________________', fontSize: 10, color: '#cbd5e1' },
          { text: 'Authorized Signature', style: 'signatureLabel', margin: [0, 6, 0, 0] }
        ]
      },
      {
        width: '50%',
        stack: [
          { text: 'Customer Acceptance', fontSize: 10, bold: true, margin: [0, 40, 0, 35] },
          { text: '____________________________', fontSize: 10, color: '#cbd5e1' },
          { text: 'Signature & Date', style: 'signatureLabel', margin: [0, 6, 0, 0] }
        ]
      }
    ],
    margin: [0, 30, 0, 0]
  };

  // Build document definition
  // Column widths: NO(25) | MODEL(55) | DESC(*) | IMAGE(55) | QTY(30) | PRICE(60) | TOTAL(65)
  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 80, 40, 60], // Left, Top, Right, Bottom - optimized for better pagination
    content: [
      ...headerContent,
      {
        table: {
          headerRows: 1,
          widths: [25, 55, '*', 55, 30, 60, 65],
          body: itemsTableBody,
          dontBreakRows: true, // Keep rows together - don't split rows across pages
          keepWithHeaderRows: 1 // Repeat header on each new page
        },
        layout: {
          hLineWidth: function(i, node) { 
            return (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5; 
          },
          vLineWidth: function() { return 0.5; },
          hLineColor: function(i) { return i === 1 ? '#1e40af' : '#e2e8f0'; },
          vLineColor: function() { return '#e2e8f0'; },
          fillColor: function(rowIndex) { return rowIndex === 0 ? '#f1f5f9' : null; },
          paddingLeft: function() { return 3; },
          paddingRight: function() { return 3; },
          paddingTop: function() { return 4; },
          paddingBottom: function() { return 4; }
        }
      },
      { text: '', margin: [0, 15, 0, 0] }, // Spacing before totals
      {
        ...totalsTable,
        pageBreak: 'avoid' // Try to keep totals on same page
      },
      { text: '', margin: [0, 15, 0, 0] }, // Spacing before terms
      ...termsSection,
      { text: '', margin: [0, 20, 0, 0] }, // Spacing before signature
      {
        ...signatureSection,
        pageBreak: 'avoid' // Keep signature section together
      }
    ],
    styles: {
      companyName: { fontSize: 16, bold: true, color: '#1e3a5f' },
      companyInfo: { fontSize: 9, color: '#64748b' },
      quotationTitle: { fontSize: 22, bold: true, color: '#1e3a5f' },
      quotationNumber: { fontSize: 11, color: '#64748b' },
      quotationDate: { fontSize: 10, color: '#64748b' },
      sectionLabel: { fontSize: 9, bold: true, color: '#1e3a5f' },
      customerName: { fontSize: 12, bold: true, color: '#1e293b' },
      customerInfo: { fontSize: 10, color: '#64748b' },
      tableHeader: { fontSize: 8, bold: true, color: '#1e3a5f', margin: [0, 6, 0, 6] },
      sectionTitle: { fontSize: 10, bold: true, color: '#1e3a5f' },
      termsText: { fontSize: 8, color: '#64748b', lineHeight: 1.4 },
      vatNote: { fontSize: 8, color: '#64748b', italics: true, lineHeight: 1.4 },
      quotationMessage: { fontSize: 9, color: '#1e293b', lineHeight: 1.5 },
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
        margin: [40, 10, 40, 0]
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
        throw new Error('No items to include in PDF');
      }
      
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
