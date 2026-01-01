# Backend Scripts

This directory contains utility scripts for database setup, migrations, and data import.

## Setup Scripts

### `create-users-table.js`
Creates the users table and initial admin user.

**Usage:**
```bash
node backend/scripts/create-users-table.js
```

**Default Admin Credentials:**
- Username: `admin`
- Password: `Admin@123`

⚠️ **Important**: Change the default password after first login!

---

### `add-brand-country-columns.js`
Adds country and flag image columns to the brands table.

**Usage:**
```bash
node backend/scripts/add-brand-country-columns.js
```

**What it does:**
- Adds `country_en` (VARCHAR)
- Adds `country_ar` (VARCHAR)
- Adds `flag_image` (VARCHAR)

---

### `add-quotation-currency-vat.js`
Adds currency and VAT rate columns to the quotations table.

**Usage:**
```bash
node backend/scripts/add-quotation-currency-vat.js
```

**What it does:**
- Adds `currency` (VARCHAR, default: 'AED')
- Adds `vat_rate` (NUMERIC, default: 5.00)

---

### `add-quotation-indexes.js`
Adds database indexes to improve query performance.

**Usage:**
```bash
node backend/scripts/add-quotation-indexes.js
```

**Indexes created:**
- `created_at` on quotations
- `status` on quotations
- `customer_name` on quotations
- `quotation_number` on quotations
- `date` on quotations
- Composite index on `(status, created_at)`

---

## Data Import Scripts

### `import-csv-data.js`
Imports data from CSV files into the database.

**Prerequisites:**
Place CSV files in `data_sample_schema/` directory:
- `brands.csv`
- `categories.csv`
- `subcategories.csv`
- `products.csv`

**Usage:**
```bash
node backend/scripts/import-csv-data.js
```

**Features:**
- Preserves original IDs from CSV
- Updates existing records if ID exists
- Creates new records if ID doesn't exist
- Handles foreign key relationships
- Updates PostgreSQL sequences
- Comprehensive error logging
- Progress tracking for large imports
- Summary report at the end

**CSV Format:**
- Supports multiline fields
- Handles JSON specifications
- Auto-generates image URLs from product IDs

---

### `import-images-to-db.js`
Downloads images from FTP and stores them in the database.

**Usage:**
```bash
node backend/scripts/import-images-to-db.js
```

**What it does:**
- Connects to FTP server
- Downloads product images
- Stores images as BYTEA in PostgreSQL
- Updates `image_data` and `image_mime_type` columns

**Requirements:**
- FTP configuration in `.env`
- Products must exist in database
- Image files must exist on FTP server

---

## Migration Scripts

### `add-image-column.js`
Adds image storage columns to the products table.

**Usage:**
```bash
node backend/scripts/add-image-column.js
```

**What it does:**
- Adds `image_data` (BYTEA) column
- Adds `image_mime_type` (VARCHAR) column

---

## Utility Scripts

### `check-image-urls.js`
Validates image URLs in the database.

**Usage:**
```bash
node backend/scripts/check-image-urls.js
```

---

### `update-image-urls.js`
Updates image URLs in the database.

**Usage:**
```bash
node backend/scripts/update-image-urls.js
```

---

### `update-image-urls-to-proxy.js`
Converts image URLs to use proxy endpoint.

**Usage:**
```bash
node backend/scripts/update-image-urls-to-proxy.js
```

---

## Running Scripts in Order

For a fresh installation, run scripts in this order:

```bash
# 1. Create users table
node backend/scripts/create-users-table.js

# 2. Add brand country columns
node backend/scripts/add-brand-country-columns.js

# 3. Add quotation currency and VAT
node backend/scripts/add-quotation-currency-vat.js

# 4. Add database indexes
node backend/scripts/add-quotation-indexes.js

# 5. Import CSV data (optional)
node backend/scripts/import-csv-data.js

# 6. Add image columns
node backend/scripts/add-image-column.js

# 7. Import images (optional)
node backend/scripts/import-images-to-db.js
```

## Notes

- All scripts are idempotent (safe to run multiple times)
- Scripts check for existing data before inserting
- Error logging is comprehensive
- Scripts update database sequences to prevent ID conflicts

## Troubleshooting

**Database Connection Error:**
- Verify `DATABASE_URL` in `.env`
- Check database server is running
- Verify network connectivity

**Import Errors:**
- Check CSV file format
- Verify file encoding (UTF-8)
- Check foreign key relationships
- Review error logs in console

**Image Import Errors:**
- Verify FTP configuration
- Check FTP server connectivity
- Verify image files exist on FTP
- Check file permissions
