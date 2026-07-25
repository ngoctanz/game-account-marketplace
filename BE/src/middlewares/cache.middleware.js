import { getRedisClient } from "../config/redis.js";

/**
 * Cache middleware for Express routes
 * @param {number} durationInSeconds - How long to cache the response
 */
export const cacheMiddleware = (durationInSeconds = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    const redisClient = getRedisClient();
    
    // If Redis is not connected, skip caching and proceed to controller
    if (!redisClient) {
      return next();
    }

    try {
      // Create a unique cache key based on the URL and query parameters
      // Example: /v1/accounts?page=1&limit=20
      const cacheKey = `cache:${req.originalUrl || req.url}`;
      
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        // Cache Hit: Send cached JSON immediately
        return res.json(JSON.parse(cachedData));
      }

      // Cache Miss: Wrap res.json to capture the data before sending it
      const originalJson = res.json.bind(res);
      
      res.json = (body) => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300 && body && body.success !== false) {
          try {
            // Save to Redis asynchronously so we don't block the response
            redisClient.setEx(cacheKey, durationInSeconds, JSON.stringify(body));
          } catch (e) {
            console.error("[Cache] Failed to save to Redis:", e.message);
          }
        }
        
        // Return original response to user
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error("[Cache Middleware Error]", error.message);
      // Fallback to normal flow if Redis fails
      next();
    }
  };
};
