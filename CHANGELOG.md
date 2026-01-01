# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-XX

### Added
- Initial release of HorecaHost Quotation Management System
- Product management with CRUD operations
- Quotation builder with auto-calculated totals and VAT
- PDF generation with professional formatting
- Multi-currency support (AED, USD, SAR, GBP, EUR)
- Flexible VAT rates (0%, 5%, or custom)
- Authentication system with JWT
- Dashboard with business metrics
- Settings management for company information
- Brand, category, and subcategory management
- Multi-language support (English/Arabic)
- Theme customization (light/dark modes)
- Image management with PostgreSQL storage
- CSV data import functionality
- Search functionality across all data pages
- Pagination for large datasets
- Performance optimizations (code splitting, caching, indexing)

### Features
- **Products**: Full CRUD with images, descriptions, specifications
- **Quotations**: Create, edit, view, and delete quotations
- **PDF Export**: Professional PDF generation with branding
- **Dashboard**: Real-time metrics and performance indicators
- **Settings**: Comprehensive company and system configuration
- **Authentication**: Secure login with JWT tokens
- **Theming**: Modern theme system with customization options

### Technical
- React 18 with Vite build system
- Express.js backend with PostgreSQL
- JWT authentication
- pdfmake for PDF generation
- Tailwind CSS for styling
- Optimized performance with lazy loading and caching

### Security
- JWT-based authentication
- Password hashing with bcryptjs
- Input validation
- SQL injection protection
- XSS protection

---

## [Unreleased]

### Planned
- Advanced reporting features
- Email quotation sending
- Multi-user roles and permissions
- API rate limiting
- Advanced search filters
- Export to Excel
- Mobile app support

