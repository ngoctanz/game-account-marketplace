import express from "express";
import { accountController } from "../controllers/account.controller.js";
import {
  authenticate,
  requireAdmin,
  optionalAuth,
} from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";
import { accountValidation } from "../validations/account.validation.js";
import {
  purchaseLimiter,
  sensitiveOpLimiter,
  adminCredentialLimiter,
} from "../middlewares/rate-limit.middleware.js";
import { cacheMiddleware } from "../middlewares/cache.middleware.js";

import { upload } from "../middlewares/upload.middleware.js";

const router = express.Router();

// ADMIN ONLY - Get ALL accounts with credentials
router.get(
  "/admin/list",
  authenticate,
  requireAdmin,
  accountController.getAllAccountsWithCredentials
);

// PUBLIC - List accounts (NO credentials) - Cached for 120 seconds (2 minutes)
router.get("/", cacheMiddleware(120), accountController.getAllAccounts);

// PUBLIC - Get single account (NO credentials)
router.get("/:id", optionalAuth, accountController.getAccountById);

// ADMIN ONLY - Get account WITH credentials (rate limited)
router.get(
  "/:id/credentials",
  authenticate,
  requireAdmin,
  adminCredentialLimiter,
  accountController.getAccountByIdWithCredentials
);

// ADMIN ONLY - Create account (with credentials)
router.post(
  "/",
  authenticate,
  requireAdmin,
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "images", maxCount: 20 }
  ]),
  (req, res, next) => {
    if (req.body.credentials && typeof req.body.credentials === "string") {
      try {
        req.body.credentials = JSON.parse(req.body.credentials);
      } catch (e) {
        return res.status(400).json({ success: false, message: "Invalid credentials format" });
      }
    }
    // Handle images if sent as string (e.g. url from package)
    if (req.body.images && typeof req.body.images === "string") {
      req.body.images = [req.body.images];
    }
    // Handle coverImage if sent as string
    if (req.body.coverImage && typeof req.body.coverImage === "string") {
      // Keep as string, it's a URL
    }
    // Handle featuredSkins if sent as JSON string
    if (req.body.featuredSkins && typeof req.body.featuredSkins === "string") {
      try {
        req.body.featuredSkins = JSON.parse(req.body.featuredSkins);
      } catch (e) {
        // If not JSON, treat as comma-separated string
        req.body.featuredSkins = req.body.featuredSkins.split(",").map(s => s.trim()).filter(s => s);
      }
    }
    next();
  },
  validateRequest(accountValidation.create),
  accountController.createAccount
);

// ADMIN ONLY - Bulk Create Accounts
router.post(
  "/bulk",
  authenticate,
  requireAdmin,
  accountController.bulkCreateAccounts
);

// ADMIN ONLY - Update account
router.patch(
  "/:id",
  authenticate,
  requireAdmin,
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "images", maxCount: 20 }
  ]),
  (req, res, next) => {
    if (req.body.credentials && typeof req.body.credentials === "string") {
      try {
        req.body.credentials = JSON.parse(req.body.credentials);
      } catch (e) {
        return res.status(400).json({ success: false, message: "Invalid credentials format" });
      }
    }
    // Handle images if sent as string
    if (req.body.images && typeof req.body.images === "string") {
      req.body.images = [req.body.images];
    }
    // Handle coverImage if sent as string
    if (req.body.coverImage && typeof req.body.coverImage === "string") {
      // Keep as string, it's a URL
    }
    // Handle featuredSkins if sent as JSON string
    if (req.body.featuredSkins && typeof req.body.featuredSkins === "string") {
      try {
        req.body.featuredSkins = JSON.parse(req.body.featuredSkins);
      } catch (e) {
        // If not JSON, treat as comma-separated string
        req.body.featuredSkins = req.body.featuredSkins.split(",").map(s => s.trim()).filter(s => s);
      }
    }
    next();
  },
  validateRequest(accountValidation.update),
  accountController.updateAccount
);

// ADMIN ONLY - Delete account
router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  accountController.deleteAccount
);

// ADMIN ONLY - Bulk delete accounts
router.post(
  "/bulk-delete",
  authenticate,
  requireAdmin,
  accountController.bulkDeleteAccounts
);

// USER - Purchase account (rate limited: 5 per minute)
router.post(
  "/:id/purchase",
  authenticate,
  purchaseLimiter,
  accountController.purchaseAccount
);

// ============ CLONE ACCOUNT ROUTES ============

// ADMIN ONLY - Create clone account with initial sub-accounts
router.post(
  "/clone",
  authenticate,
  requireAdmin,
  accountController.createCloneAccount
);

// ADMIN ONLY - Bulk add clone accounts to an existing account
router.post(
  "/:id/clone-accounts",
  authenticate,
  requireAdmin,
  accountController.bulkAddCloneAccounts
);

// ADMIN ONLY - Get clone account credentials (all sub-accounts)
router.get(
  "/:id/clone-credentials",
  authenticate,
  requireAdmin,
  adminCredentialLimiter,
  accountController.getCloneAccountCredentials
);

// ADMIN ONLY - Delete a single sub-account from clone account
router.delete(
  "/:id/clone-accounts/:index",
  authenticate,
  requireAdmin,
  accountController.deleteCloneSubAccount
);

// USER - Purchase from a specific clone account (rate limited)
router.post(
  "/:id/clone-purchase",
  authenticate,
  purchaseLimiter,
  accountController.purchaseCloneAccount
);

export default router;

