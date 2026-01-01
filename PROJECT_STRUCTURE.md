# Project Structure & Architecture

This document provides a detailed overview of the HorecaHost project structure, organization, and architecture decisions.

## 📁 Directory Structure

```
HorecaHost/
├── backend/                          # Backend application
│   ├── config/                       # Configuration files
│   │   └── constants.js             # Backend constants and configuration
│   ├── data/                         # Database files (auto-created, gitignored)
│   │   └── quotations.db             # SQLite database (if used)
│   ├── logo/                         # Company logo assets
│   │   └── horecahost_logo_new.png   # Default logo
│   ├── middleware/                   # Express middleware
│   │   ├── auth.js                   # JWT authentication middleware
│   │   └── cache.js                  # API response caching middleware
│   ├── routes/                       # API route handlers
│   │   ├── auth.js                   # Authentication endpoints
│   │   ├── brands.js                 # Brand management endpoints
│   │   ├── categories.js             # Category management endpoints
│   │   ├── images.js                 # Image serving endpoints
│   │   ├── products.js               # Product CRUD endpoints
│   │   ├── quotations.js             # Quotation management endpoints
│   │   ├── settings.js               # Settings management endpoints
│   │   └── subcategories.js          # Subcategory management endpoints
│   ├── scripts/                      # Utility and migration scripts
│   │   ├── add-brand-country-columns.js
│   │   ├── add-image-column.js
│   │   ├── add-quotation-currency-vat.js
│   │   ├── add-quotation-indexes.js
│   │   ├── create-users-table.js
│   │   ├── import-csv-data.js        # CSV data import utility
│   │   ├── import-images-to-db.js    # Image import from FTP
│   │   └── README.md                 # Scripts documentation
│   ├── services/                     # Business logic services
│   │   └── pdfGenerator.js           # PDF generation service
│   ├── uploads/                      # User uploaded files (gitignored)
│   │   ├── logo/                     # Company logos
│   │   └── products/                 # Product images
│   ├── database.js                   # Database connection and setup
│   ├── server.js                     # Express server entry point
│   └── setup-fonts.js                # PDF font setup (optional)
│
├── frontend/                         # Frontend React application
│   ├── public/                       # Static public assets
│   │   ├── favicon.svg
│   │   └── logo.png
│   ├── src/
│   │   ├── api/                      # API client
│   │   │   └── index.js              # Axios instance and API methods
│   │   ├── components/               # Reusable React components
│   │   │   ├── AuthRoute.jsx         # Protected route wrapper
│   │   │   ├── Loading.jsx           # Loading spinner component
│   │   │   └── ThemeCustomizer.jsx   # Theme customization UI
│   │   ├── contexts/                 # React Context providers
│   │   │   ├── AuthContext.jsx       # Authentication state management
│   │   │   └── ThemeContext.jsx      # Theme state management
│   │   ├── hooks/                    # Custom React hooks
│   │   │   └── useDebounce.js        # Debounce hook for search
│   │   ├── pages/                    # Page components (lazy loaded)
│   │   │   ├── Dashboard.jsx         # Main dashboard
│   │   │   ├── LoginPage.jsx         # Login page
│   │   │   ├── ManagePage.jsx        # Data management (brands, categories)
│   │   │   ├── ProductsPage.jsx      # Product listing and management
│   │   │   ├── QuotationEdit.jsx     # Edit quotation page
│   │   │   ├── QuotationNew.jsx      # Create quotation page
│   │   │   ├── QuotationsPage.jsx    # Quotations listing
│   │   │   ├── QuotationView.jsx     # View quotation page
│   │   │   └── SettingsPage.jsx      # Settings page
│   │   ├── utils/                    # Utility functions
│   │   │   ├── constants.js          # Frontend constants
│   │   │   ├── debounce.js           # Debounce utility function
│   │   │   ├── flagUtils.js          # Country flag utilities
│   │   │   └── formatters.js         # Currency and date formatters
│   │   ├── App.jsx                   # Main app component with routing
│   │   ├── main.jsx                  # React entry point
│   │   └── index.css                 # Global styles and Tailwind
│   ├── index.html                    # HTML template
│   ├── package.json                  # Frontend dependencies
│   ├── postcss.config.js             # PostCSS configuration
│   ├── tailwind.config.js            # Tailwind CSS configuration
│   └── vite.config.js                # Vite build configuration
│
├── data_sample_schema/                # Sample CSV data files
│   ├── brands.csv
│   ├── categories.csv
│   ├── products.csv
│   └── subcategories.csv
│
├── .gitignore                        # Git ignore rules
├── CHANGELOG.md                      # Version history
├── CONTRIBUTING.md                   # Contribution guidelines
├── LICENSE                           # License file
├── package.json                      # Root package.json with scripts
├── PROJECT_STRUCTURE.md               # This file
└── README.md                         # Main project documentation
```

## 🏗️ Architecture Overview

### Backend Architecture

**Layered Architecture:**
1. **Routes Layer** (`routes/`) - HTTP request handling
2. **Middleware Layer** (`middleware/`) - Authentication, caching, validation
3. **Services Layer** (`services/`) - Business logic (PDF generation, etc.)
4. **Database Layer** (`database.js`) - Database connection and queries

**Key Design Patterns:**
- RESTful API design
- Middleware pattern for cross-cutting concerns
- Service layer for business logic separation
- Repository pattern for data access

### Frontend Architecture

**Component Structure:**
- **Pages** - Top-level route components (lazy loaded)
- **Components** - Reusable UI components
- **Contexts** - Global state management (Auth, Theme)
- **Hooks** - Custom React hooks for reusable logic
- **Utils** - Pure utility functions

**Key Design Patterns:**
- Component composition
- Context API for global state
- Custom hooks for reusable logic
- Lazy loading for code splitting

## 📦 Key Files Explained

### Backend

**`server.js`**
- Express server setup
- Middleware configuration
- Route registration
- Error handling
- Server startup

**`database.js`**
- PostgreSQL connection pool
- Database initialization
- Schema creation
- Connection management

**`routes/*.js`**
- RESTful API endpoints
- Request validation
- Database queries
- Response formatting

**`services/pdfGenerator.js`**
- PDF document generation
- Image processing
- Template rendering
- File output

### Frontend

**`App.jsx`**
- React Router setup
- Route definitions
- Protected routes
- Layout structure

**`main.jsx`**
- React app initialization
- Context providers
- Router setup

**`api/index.js`**
- Axios instance configuration
- API method definitions
- Request/response interceptors
- Error handling

## 🔄 Data Flow

### Request Flow (Backend)
```
Client Request
  ↓
Express Middleware (CORS, JSON, Auth)
  ↓
Route Handler
  ↓
Service Layer (if needed)
  ↓
Database Query
  ↓
Response
```

### Component Flow (Frontend)
```
User Interaction
  ↓
Component Event Handler
  ↓
API Call (via api/index.js)
  ↓
Context Update (if needed)
  ↓
Component Re-render
```

## 🗄️ Database Schema

### Core Tables
- `users` - User accounts and authentication
- `products` - Product catalog
- `brands` - Product brands
- `categories` - Product categories
- `subcategories` - Product subcategories
- `quotations` - Quotation headers
- `quotation_items` - Quotation line items
- `settings` - System settings

### Relationships
- Products → Brands (many-to-one)
- Products → Categories (many-to-one)
- Products → Subcategories (many-to-one)
- Quotations → Quotation Items (one-to-many)
- Quotation Items → Products (many-to-one)

## 🚀 Performance Optimizations

### Frontend
- **Code Splitting**: Lazy loading of page components
- **Debouncing**: Search input debouncing
- **Memoization**: React.memo for expensive components
- **Optimized Builds**: Vite with manual chunking

### Backend
- **Caching**: In-memory cache for metadata endpoints
- **Indexing**: Database indexes on frequently queried columns
- **Pagination**: Server-side pagination for large datasets
- **Query Optimization**: Select only needed columns

## 🔒 Security

### Authentication
- JWT tokens for stateless authentication
- Password hashing with bcryptjs
- Token expiration (7 days)
- Protected routes with middleware

### Data Protection
- Input validation on all endpoints
- SQL injection protection (parameterized queries)
- XSS protection (React's built-in)
- CORS configuration

## 📝 Best Practices

1. **Code Organization**
   - Separation of concerns
   - Reusable components and utilities
   - Consistent naming conventions
   - Clear file structure

2. **Error Handling**
   - Try-catch blocks in async functions
   - Proper error logging
   - User-friendly error messages
   - Graceful degradation

3. **Performance**
   - Lazy loading where appropriate
   - Debouncing for search
   - Caching for static data
   - Database indexing

4. **Maintainability**
   - Clear documentation
   - Consistent code style
   - Modular architecture
   - Version control best practices

## 🔧 Configuration

### Environment Variables
See `.env.example` for all required environment variables.

### Build Configuration
- **Vite**: `frontend/vite.config.js`
- **Tailwind**: `frontend/tailwind.config.js`
- **PostCSS**: `frontend/postcss.config.js`

### Database Configuration
- Connection string in `DATABASE_URL`
- Schema initialization in `database.js`
- Migrations in `backend/scripts/`

## 📚 Additional Documentation

- **README.md** - Main project documentation
- **CONTRIBUTING.md** - Contribution guidelines
- **CHANGELOG.md** - Version history
- **backend/scripts/README.md** - Scripts documentation
