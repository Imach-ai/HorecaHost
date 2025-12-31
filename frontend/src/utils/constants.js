// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 100
export const PRODUCTS_INITIAL_LOAD = 200
export const PRODUCTS_SEARCH_LIMIT = 50

// Debounce timings (milliseconds)
export const SEARCH_DEBOUNCE_MS = 300

// Date formats
export const DATE_FORMAT = {
  display: { day: '2-digit', month: 'short', year: 'numeric' },
  input: 'YYYY-MM-DD'
}

// Currency
export const CURRENCY = {
  code: 'AED',
  locale: 'en-US',
  decimals: 2
}

// Cache keys
export const CACHE_KEYS = {
  SETTINGS: 'app_settings',
  BRANDS: 'meta_brands',
  CATEGORIES: 'meta_categories'
}

