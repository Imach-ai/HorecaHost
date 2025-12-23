# HORECA Quotation Tool

A professional quotation generator web application for HORECA (Hotel, Restaurant, Catering) equipment businesses.

## Features

- **Product Management**: Add, edit, and delete products with images, descriptions, and pricing
- **Quotation Builder**: Create professional quotations with auto-calculated totals and VAT
- **PDF Export**: Generate PDF quotations matching professional standards
- **Settings**: Configure company information, terms & conditions, and branding
- **Dashboard**: Overview of products, quotations, and business metrics

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: SQLite (no setup required)
- **Frontend**: React + Vite + Tailwind CSS
- **PDF Generation**: pdfmake

## Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

1. **Open terminal in project directory**

```bash
cd horeca_quotation_tool
```

2. **Install backend dependencies**

```bash
npm install
```

3. **Install frontend dependencies**

```bash
cd frontend
npm install
cd ..
```

4. **Download fonts for PDF generation (optional - works without)**

```bash
node backend/setup-fonts.js
```

The PDF generator works with built-in fonts. Custom fonts improve appearance.

5. **Seed sample data (optional)**

```bash
node backend/seed.js
```

6. **Start the application**

**Development mode (with hot reload):**
```bash
# In one terminal - start backend
node backend/server.js

# In another terminal - start frontend
cd frontend
npm run dev
```

**Production mode:**
```bash
cd frontend
npm run build
cd ..
set NODE_ENV=production
node backend/server.js
```

7. **Open in browser**

- Development: http://localhost:5173
- Production: http://localhost:3001

## Project Structure

```
horeca_quotation_tool/
├── backend/
│   ├── data/              # SQLite database (auto-created)
│   ├── fonts/             # PDF fonts
│   ├── routes/            # API endpoints
│   ├── services/          # PDF generator
│   ├── uploads/           # Product images and logo
│   ├── database.js        # Database setup
│   ├── seed.js            # Sample data
│   └── server.js          # Express server
├── frontend/
│   ├── public/            # Static assets
│   └── src/
│       ├── api/           # API client
│       └── pages/         # React pages
├── package.json
└── README.md
```

## API Endpoints

### Products
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (multipart/form-data)
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Quotations
- `GET /api/quotations` - List all quotations
- `GET /api/quotations/:id` - Get single quotation with items
- `POST /api/quotations` - Create quotation
- `PUT /api/quotations/:id` - Update quotation
- `DELETE /api/quotations/:id` - Delete quotation
- `GET /api/quotations/:id/pdf` - Download PDF

### Settings
- `GET /api/settings` - Get all settings
- `PUT /api/settings` - Update settings
- `POST /api/settings/logo` - Upload company logo

## Configuration

### Environment Variables (optional)

Create a `.env` file in the root directory:

```env
PORT=3001
NODE_ENV=production
```

### Company Settings

Configure via the Settings page in the application:
- Company name, address, phone, email
- Company logo
- VAT rate (default: 5%)
- Currency (default: AED)
- Terms & Conditions
- Delivery & Warranty info
- Bank details

## Deployment

### Option 1: VPS/Dedicated Server

1. Install Node.js 18+
2. Clone the repository
3. Run installation steps above
4. Use PM2 for process management:

```bash
npm install -g pm2
pm2 start backend/server.js --name "quotation-tool"
pm2 save
pm2 startup
```

### Option 2: Shared Hosting with Node.js Support

1. Upload all files via FTP/SFTP
2. Set up Node.js application in control panel
3. Set entry point to `backend/server.js`
4. Set environment to production

### Nginx Reverse Proxy (recommended for VPS)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Backup

The SQLite database is stored in `backend/data/quotations.db`. 
Back up this file regularly along with the `backend/uploads/` directory.

## License

Private - For internal business use only.

## Support

For issues or feature requests, please contact your developer.

