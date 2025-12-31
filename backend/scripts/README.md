# CSV Data Import Script

This script imports data from CSV files into the Neon DB PostgreSQL database.

## Files Required

Place these CSV files in the `data_sample_schema` folder:
- `brands.csv`
- `categories.csv`
- `subcategories.csv`
- `products.csv`

## Usage

```bash
cd backend
node scripts/import-csv-data.js
```

## What It Does

1. **Imports Brands** - Creates/updates brand records
2. **Imports Categories** - Creates/updates category records
3. **Imports Subcategories** - Creates/updates subcategory records (requires categories)
4. **Imports Products** - Creates/updates product records with:
   - All product data from CSV
   - Image URLs built from product IDs (FTP format)
   - Specifications parsed from JSON

## Image URL Format

For each product, the script builds image URLs using this pattern:
```
ftp://admin%40horecahost.com@gator4456.hostgator.com/public_html/posted_images/product/300x300/post_0000_{product_id}.jpg
```

Where `{product_id}` is the product ID from the CSV.

## Features

- ✅ Preserves original IDs from CSV
- ✅ Updates existing records if ID exists
- ✅ Creates new records if ID doesn't exist
- ✅ Handles foreign key relationships
- ✅ Updates PostgreSQL sequences after import
- ✅ Comprehensive error logging
- ✅ Progress tracking for large imports
- ✅ Summary report at the end

## Safety

- The script checks if records exist before inserting
- Updates sequences to prevent ID conflicts
- Logs all errors without stopping the import
- Can be run multiple times safely (idempotent)

## Notes

- Make sure your `.env` file has the correct `DATABASE_URL`
- The script handles multiline CSV fields automatically
- Image URLs are stored as JSONB arrays in the database
- Specifications are parsed from JSON format in CSV

