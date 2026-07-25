import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { env } from "./config/environment.js";
import { corsOptions } from "./config/cors.js";
import { connectDatabase } from "./config/mongodb.js";
import { initRedis } from "./config/redis.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middlewares/error-handler.middleware.js";
import { responseUtils } from "./utils/response.util.js";
import { initScheduler } from "./services/scheduler.service.js";

// Security middlewares (combined)
import {
  securityHeaders,
  sanitizeData,
  sanitizeXSS,
  preventParamPollution,
} from "./middlewares/security.middleware.js";

// Rate limiting & logging
import { apiLimiter } from "./middlewares/rate-limit.middleware.js";
import { requestId, requestLogger } from "./middlewares/request-logger.middleware.js";

const app = express();

// Trust proxy (if behind nginx/load balancer)
app.set("trust proxy", 1);

// Apply middlewares
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(requestId);
app.use(requestLogger);
app.use(apiLimiter);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.use(sanitizeData);
app.use(sanitizeXSS);
app.use(preventParamPollution);

// Routes
app.use("/v1", routes);

// 404 handler
app.use((req, res) => {
  responseUtils.notFound(res, "Endpoint not found");
});

// Global error handler
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDatabase();
    
    // Initialize Redis connection
    await initRedis();
    
    // Initialize scheduled jobs
    initScheduler();
    
    app.listen(env.APP_PORT, env.APP_HOST, () => {
      console.log(`🚀 Server running on http://${env.APP_HOST}:${env.APP_PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
