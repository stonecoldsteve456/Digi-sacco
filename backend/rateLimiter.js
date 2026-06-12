const rateLimitMap = new Map();

/**
 * Simple rate limiter
 * @param {string} key - Identifier for the rate limit (e.g., user ID, IP address)
 * @param {number} windowMs - Window size in milliseconds
 * @param {number} maxRequests - Maximum requests allowed in the window
 * @returns {boolean} - true if request is allowed, false if rate limited
 */
function rateLimiter(key, windowMs, maxRequests) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Clean up old entries
  for (const [k, v] of rateLimitMap.entries()) {
    if (v.timestamp < windowStart) {
      rateLimitMap.delete(k);
    }
  }
  
  const record = rateLimitMap.get(key) || { count: 0, timestamp: now };
  
  // Reset count if window has passed
  if (record.timestamp < windowStart) {
    record.count = 0;
    record.timestamp = now;
  }
  
  // Check if limit exceeded
  if (record.count >= maxRequests) {
    return false;
  }
  
  // Increment count and update timestamp
  record.count += 1;
  record.timestamp = now;
  rateLimitMap.set(key, record);
  
  return true;
}

/**
 * Middleware function for rate limiting in Express
 * @param {Object} options - Configuration options
 * @param {number} options.windowMs - Window size in milliseconds (default: 900000 = 15 minutes)
 * @param {number} options.max - Maximum requests per window (default: 100)
 * @param {Function} options.keyGenerator - Function to generate key from request (default: uses IP)
 * @returns {Function} - Express middleware function
 */
function rateLimit(options = {}) {
  const {
    windowMs = 900000, // 15 minutes
    max = 100,         // limit each IP to 100 requests per windowMs
    keyGenerator = (req) => req.ip || req.connection.remoteAddress
  } = options;
  
  return function rateLimitMiddleware(req, res, next) {
    const key = keyGenerator(req);
    if (!rateLimiter(key, windowMs, max)) {
      return res.status(429).json({
        error: 'Too many requests, please try again later.'
      });
    }
    next();
  };
}

module.exports = { rateLimiter, rateLimit };