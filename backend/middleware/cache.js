// Simple in-memory cache for metadata endpoints
const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCacheKey(req) {
  return `${req.method}:${req.originalUrl}`
}

function isCacheable(req) {
  // Only cache GET requests to metadata endpoints
  return req.method === 'GET' && (
    req.path.includes('/meta/') ||
    req.path.includes('/settings')
  )
}

function cacheMiddleware(req, res, next) {
  if (!isCacheable(req)) {
    return next()
  }

  const key = getCacheKey(req)
  const cached = cache.get(key)

  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return res.json(cached.data)
  }

  // Store original json method
  const originalJson = res.json.bind(res)
  
  // Override json method to cache response
  res.json = function(data) {
    cache.set(key, {
      data,
      timestamp: Date.now()
    })
    return originalJson(data)
  }

  next()
}

// Clear cache helper
function clearCache(pattern) {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key)
      }
    }
  } else {
    cache.clear()
  }
}

module.exports = {
  cacheMiddleware,
  clearCache
}

