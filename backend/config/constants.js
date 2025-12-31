// Database configuration
module.exports = {
  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 100
  },
  
  // Query timeouts
  QUERY_TIMEOUT: 30000, // 30 seconds
  
  // FTP configuration (if needed)
  FTP: {
    TIMEOUT: 30000,
    KEEP_ALIVE: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000
  },
  
  // Image configuration
  IMAGES: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  }
}

