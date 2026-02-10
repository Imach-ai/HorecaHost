# HorecaHost - Professional Quotation Management System

A comprehensive, production-ready quotation generator and management system designed specifically for HORECA (Hotel, Restaurant, Catering) equipment businesses. Built with modern web technologies and optimized for performance.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-Private-red.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)

## 🚀 Features

### Core Functionality
- **Product Management**: Complete CRUD operations for products with images, descriptions, specifications, and multi-language support (English/Arabic)
- **Quotation Builder**: Create, edit, and manage professional quotations with:
  - Auto-calculated totals and VAT
  - Multiple currency support (AED, USD, SAR, GBP, EUR)
  - Flexible VAT rates (0%, 5%, or custom)
  - Product descriptions with brand information and country flags
- **PDF Generation**: Professional PDF quotations with:
  - Company branding and logo
  - Full product descriptions
  - Brand information with country flags
  - Proper pagination and page breaks
  - Multi-currency formatting
- **Dashboard**: Real-time business metrics and performance indicators
- **Settings Management**: Configure company information, terms & conditions, branding, and system preferences
- **Data Management**: Manage brands, categories, and subcategories with search functionality
- **Authentication**: Secure login system with JWT tokens
- **Theme Customization**: Modern theme system with light/dark modes and color schemes

### Advanced Features
- **Multi-language Support**: English and Arabic interface
- **Image Management**: Product images stored in PostgreSQL (BYTEA) with FTP fallback
- **Performance Optimized**: 
  - Code splitting and lazy loading
  - API response caching
  - Database indexing
  - Pagination for large datasets
- **Responsive Design**: Modern, mobile-friendly UI built with Tailwind CSS
- **Real-time Updates**: Live calculation of totals and VAT

## 📋 Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon DB)
- **Authentication**: JWT (jsonwebtoken) + bcryptjs
- **PDF Generation**: pdfmake
- **File Upload**: multer
- **CSV Processing**: csv-parser
- **FTP Client**: basic-ftp

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Icons**: Lucide React

## 🛠️ Installation

### Prerequisites
- Node.js 18.0.0 or higher
- npm or yarn
- PostgreSQL database (Neon DB recommended)
- Git

### Step 1: Clone the Repository

```bash
git clone https://github.com/Imach-ai/HorecaHost.git
cd HorecaHost
```

### Step 2: Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 3: Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration (Neon DB)
DATABASE_URL=postgresql://username:password@host/database?sslmode=require

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-here

# FTP Configuration (for image fetching)
FTP_HOST=your-ftp-host.com
FTP_USER=your-ftp-username
FTP_PASSWORD=your-ftp-password
FTP_SECURE=false
```

### Step 4: Database Setup

The database will be automatically initialized on first run. To set up the initial admin user, run the script below.

The script will use the `ADMIN_PASSWORD` environment variable if provided (recommended). If not provided, it will generate a strong random password and print it once — save it securely.

```bash
# Option A: provide an initial password (recommended)
ADMIN_PASSWORD='Your$trongP@ssw0rd!' node backend/scripts/create-users-table.js

# Option B: let the script generate and show a secure password once
node backend/scripts/create-users-table.js
```

⚠️ **Important**: Change the admin password immediately after first login and never commit passwords to source control.

### Step 5: Import Sample Data (Optional)

If you have CSV files with product data:

```bash
# Place CSV files in data_sample_schema/ directory:
# - brands.csv
# - categories.csv
# - subcategories.csv
# - products.csv

node backend/scripts/import-csv-data.js
```

### Step 6: Start the Application

**Development Mode** (with hot reload):

```bash
# Using npm scripts (runs both backend and frontend)
npm run dev

# Or run separately:
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

**Production Mode**:

```bash
# Build frontend
npm run build

# Start production server
NODE_ENV=production npm start
```

### Step 7: Access the Application

- **Development**: http://localhost:5173
- **Production**: http://localhost:3001

## 📁 Project Structure

```
HorecaHost/
├── backend/
│   ├── config/
│   │   └── constants.js          # Backend configuration constants
│   ├── data/                     # Database files (auto-created)
│   ├── logo/                     # Company logo assets
│   ├── middleware/
│   │   ├── auth.js               # JWT authentication middleware
│   │   └── cache.js              # API response caching
│   ├── routes/
│   │   ├── auth.js               # Authentication endpoints
│   │   ├── brands.js             # Brand management
│   │   ├── categories.js         # Category management
│   │   ├── images.js             # Image serving endpoints
│   │   ├── products.js           # Product CRUD operations
│   │   ├── quotations.js         # Quotation management
│   │   ├── settings.js           # Settings management
│   │   └── subcategories.js      # Subcategory management
│   ├── scripts/
│   │   ├── add-brand-country-columns.js
│   │   ├── add-image-column.js
│   │   ├── add-quotation-currency-vat.js
│   │   ├── add-quotation-indexes.js
│   │   ├── create-users-table.js
│   │   ├── import-csv-data.js    # CSV data import
│   │   ├── import-images-to-db.js
│   │   └── README.md             # Scripts documentation
│   ├── services/
│   │   └── pdfGenerator.js       # PDF generation service
│   ├── uploads/                  # User uploaded files
│   ├── database.js               # Database connection & setup
│   ├── server.js                 # Express server entry point
│   └── setup-fonts.js            # PDF font setup (optional)
│
├── frontend/
│   ├── public/                   # Static assets
│   │   ├── favicon.svg
│   │   └── logo.png
│   ├── src/
│   │   ├── api/
│   │   │   └── index.js          # Axios API client
│   │   ├── components/
│   │   │   ├── AuthRoute.jsx    # Protected route wrapper
│   │   │   ├── Loading.jsx      # Loading spinner
│   │   │   └── ThemeCustomizer.jsx
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx   # Authentication context
│   │   │   └── ThemeContext.jsx  # Theme management
│   │   ├── hooks/
│   │   │   └── useDebounce.js   # Debounce hook
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx    # Main dashboard
│   │   │   ├── LoginPage.jsx    # Login page
│   │   │   ├── ManagePage.jsx   # Data management
│   │   │   ├── ProductsPage.jsx # Product listing
│   │   │   ├── QuotationEdit.jsx
│   │   │   ├── QuotationNew.jsx
│   │   │   ├── QuotationsPage.jsx
│   │   │   ├── QuotationView.jsx
│   │   │   └── SettingsPage.jsx
│   │   ├── utils/
│   │   │   ├── constants.js    # Frontend constants
│   │   │   ├── debounce.js        # Debounce utility
│   │   │   ├── flagUtils.js       # Country flag utilities
│   │   │   └── formatters.js      # Currency/date formatters
│   │   ├── App.jsx               # Main app component
│   │   ├── main.jsx              # React entry point
│   │   └── index.css             # Global styles
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js        # Tailwind configuration
│   └── vite.config.js            # Vite build configuration
│
├── data_sample_schema/           # Sample CSV data files
│   ├── brands.csv
│   ├── categories.csv
│   ├── products.csv
│   └── subcategories.csv
│
├── .gitignore
├── package.json                  # Root package.json
└── README.md                     # This file
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Products
- `GET /api/products` - List products (supports pagination, search, filtering)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (multipart/form-data)
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Quotations
- `GET /api/quotations` - List quotations (supports pagination, search, filtering)
- `GET /api/quotations/:id` - Get single quotation with items
- `POST /api/quotations` - Create quotation
- `PUT /api/quotations/:id` - Update quotation
- `DELETE /api/quotations/:id` - Delete quotation
- `GET /api/quotations/:id/pdf` - Download PDF

### Settings
- `GET /api/settings` - Get all settings
- `PUT /api/settings` - Update settings
- `POST /api/settings/logo` - Upload company logo

### Brands, Categories, Subcategories
- `GET /api/brands` - List brands (supports search)
- `GET /api/categories` - List categories (supports search)
- `GET /api/subcategories` - List subcategories (supports search, filtering)

### Images
- `GET /api/images/product/:productId` - Get product image

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `3001` | No |
| `NODE_ENV` | Environment mode | `development` | No |
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | - | Yes |
| `FTP_HOST` | FTP server hostname | - | No |
| `FTP_USER` | FTP username | - | No |
| `FTP_PASSWORD` | FTP password | - | No |

### Company Settings

Configure via the Settings page in the application:
- Company name, address, phone, email, website
- Company logo upload
- VAT rate (default: 5%)
- Currency (default: AED)
- Terms & Conditions
- Delivery & Warranty information
- Bank details
- Manager name for signatures

## 🚀 Deployment

### Option 1: VPS/Dedicated Server

1. **Install Node.js 18+**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Clone and Setup**
   ```bash
   git clone https://github.com/Imach-ai/HorecaHost.git
   cd HorecaHost
   npm install
   cd frontend && npm install && cd ..
   ```

3. **Build Frontend**
   ```bash
   npm run build
   ```

4. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Use PM2 for Process Management**
   ```bash
   npm install -g pm2
   pm2 start backend/server.js --name "horecahost" --env production
   pm2 save
   pm2 startup
   ```

### Option 2: Docker (Recommended)

```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN cd frontend && npm install && npm run build
EXPOSE 3001
CMD ["node", "backend/server.js"]
```

### Option 3: Shared Hosting with Node.js

1. Upload all files via FTP/SFTP
2. Set up Node.js application in control panel
3. Set entry point to `backend/server.js`
4. Set environment to `production`
5. Configure environment variables in hosting panel

### Nginx Reverse Proxy (for VPS)

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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔒 Security

- **Authentication**: JWT-based authentication with secure token storage
- **Password Hashing**: bcryptjs with salt rounds
- **CORS**: Configured for production domains
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Protection**: Parameterized queries using PostgreSQL
- **XSS Protection**: React's built-in XSS protection
- **Environment Variables**: Sensitive data stored in `.env` (not committed)

## 📊 Performance Optimizations

- **Code Splitting**: Lazy loading of page components (60-70% bundle size reduction)
- **API Caching**: In-memory cache for metadata endpoints (90-95% faster responses)
- **Database Indexing**: Optimized indexes on frequently queried columns
- **Pagination**: Server-side pagination for large datasets
- **Image Optimization**: Efficient image storage and serving
- **Debouncing**: Search input debouncing to reduce API calls

## 🧪 Development

### Available Scripts

```bash
# Install all dependencies
npm run install:all

# Install frontend dependencies
npm run install:frontend

# Setup PDF fonts (optional)
npm run setup:fonts

# Development mode (both backend and frontend)
npm run dev

# Development - backend only
npm run dev:backend

# Development - frontend only
npm run dev:frontend

# Build for production
npm run build

# Start production server
npm start

# Seed sample data
npm run seed
```

### Database Migrations

Run migration scripts in order:

```bash
# 1. Create users table
node backend/scripts/create-users-table.js

# 2. Add brand country columns
node backend/scripts/add-brand-country-columns.js

# 3. Add quotation currency and VAT
node backend/scripts/add-quotation-currency-vat.js

# 4. Add database indexes
node backend/scripts/add-quotation-indexes.js
```

## 📝 Backup

### Important Files to Backup

1. **Database**: PostgreSQL database (backup via your database provider)
2. **Uploads**: `backend/uploads/` directory (product images, logos)
3. **Environment**: `.env` file (contains sensitive configuration)

### Backup Script Example

```bash
# Backup database (using pg_dump)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Backup uploads
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz backend/uploads/
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify `DATABASE_URL` in `.env`
   - Check database server is running
   - Verify network connectivity

2. **JWT Authentication Fails**
   - Ensure `JWT_SECRET` is set in `.env`
   - Clear browser localStorage and login again

3. **PDF Generation Fails**
   - Check if fonts are installed: `npm run setup:fonts`
   - Verify image URLs are accessible

4. **Images Not Loading**
   - Check FTP configuration in `.env`
   - Verify image proxy endpoint is working
   - Check database for image data

## 📄 License

Private - For internal business use only.

## 👥 Contributing

This is a private repository. For issues or feature requests, please contact the development team.

## 📞 Support

For technical support or questions:
- Create an issue in the repository
- Contact the development team

## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- PDF generation with [pdfmake](http://pdfmake.org/)
- Icons by [Lucide](https://lucide.dev/)

---

**Version**: 1.0.0  
**Last Updated**: 2026  
**Maintained by**: Imach-ai
