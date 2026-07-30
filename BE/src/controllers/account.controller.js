import { accountService } from "../services/account.service.js";
import { responseUtils } from "../utils/response.util.js";
import { auditService } from "../services/audit.service.js";
import cloudinaryService from "../services/cloudinary.service.js";
import mongoose from "mongoose";

export const accountController = {
  async getAllAccounts(req, res, next) {
    try {
      const { accounts, meta } = await accountService.getAllAccounts(req.query);
      return responseUtils.successWithMeta(res, accounts, meta);
    } catch (error) {
      next(error);
    }
  },

  async getAccountById(req, res, next) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return responseUtils.badRequest(res, "Invalid Account ID");
      }
      const account = await accountService.getAccountById(req.params.id);
      return responseUtils.success(res, account);
    } catch (error) {
      if (error.message === "Account not found") {
        return responseUtils.notFound(res, error.message);
      }
      next(error);
    }
  },

  async getAccountByIdWithCredentials(req, res, next) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return responseUtils.badRequest(res, "Invalid Account ID");
      }
      const account = await accountService.getAccountByIdWithCredentials(
        req.params.id
      );
      await auditService.logCredentialAccess(req, req.params.id);
      return responseUtils.success(res, account);
    } catch (error) {
      if (error.message === "Account not found") {
        return responseUtils.notFound(res, error.message);
      }
      next(error);
    }
  },

  async createAccount(req, res, next) {
    try {
      // Handle coverImage upload
      if (req.files?.coverImage && req.files.coverImage.length > 0) {
        const result = await cloudinaryService.uploadBuffer(
          req.files.coverImage[0].buffer,
          { folder: "accounts" }
        );
        req.body.coverImage = result.url;
      }

      // Handle images upload
      if (req.files?.images && req.files.images.length > 0) {
        const uploadPromises = req.files.images.map((file) =>
          cloudinaryService.uploadBuffer(file.buffer, { folder: "accounts" })
        );
        const results = await Promise.all(uploadPromises);
        req.body.images = results.map((r) => r.url);
      }

      // Parse credentials if sent as JSON string in FormData
      if (typeof req.body.credentials === 'string') {
        try {
          req.body.credentials = JSON.parse(req.body.credentials);
        } catch (e) { }
      }

      const account = await accountService.createAccount(req.body);
      return responseUtils.success(
        res,
        account,
        "Account created successfully",
        201
      );
    } catch (error) {
      if (error.message.includes("credentials")) {
        return responseUtils.badRequest(res, error.message);
      }
      next(error);
    }
  },

  async bulkCreateAccounts(req, res, next) {
    try {
      const { accounts } = req.body; // Expecting array of { packageId, username, password, ... }
      const result = await accountService.bulkCreateAccounts(accounts);
      return responseUtils.success(
        res,
        result,
        `Successfully created ${result.length} accounts`,
        201
      );
    } catch (error) {
      next(error);
    }
  },

  async updateAccount(req, res, next) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return responseUtils.badRequest(res, "Invalid Account ID");
      }
      // Handle coverImage upload
      if (req.files?.coverImage && req.files.coverImage.length > 0) {
        const result = await cloudinaryService.uploadBuffer(
          req.files.coverImage[0].buffer,
          { folder: "accounts" }
        );
        req.body.coverImage = result.url;
      }

      // Handle images upload
      if (req.files?.images && req.files.images.length > 0) {
        const uploadPromises = req.files.images.map((file) =>
          cloudinaryService.uploadBuffer(file.buffer, { folder: "accounts" })
        );
        const results = await Promise.all(uploadPromises);
        // Merge with existing images from req.body
        const existingImages = req.body.images ? (Array.isArray(req.body.images) ? req.body.images : [req.body.images]) : [];
        const newImages = results.map((r) => r.url);
        req.body.images = [...existingImages, ...newImages];
      }

      // Parse credentials if sent as JSON string
      if (typeof req.body.credentials === 'string') {
        try {
          req.body.credentials = JSON.parse(req.body.credentials);
        } catch (e) { }
      }

      const account = await accountService.updateAccount(
        req.params.id,
        req.body
      );
      return responseUtils.success(
        res,
        account,
        "Account updated successfully"
      );
    } catch (error) {
      if (error.message === "Account not found") {
        return responseUtils.notFound(res, error.message);
      }
      next(error);
    }
  },

  async deleteAccount(req, res, next) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return responseUtils.badRequest(res, "Invalid Account ID");
      }
      await accountService.deleteAccount(req.params.id);
      return responseUtils.success(res, null, "Account deleted successfully");
    } catch (error) {
      if (error.message === "Account not found") {
        return responseUtils.notFound(res, error.message);
      }
      next(error);
    }
  },

  async purchaseAccount(req, res, next) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return responseUtils.badRequest(res, "Invalid Account ID");
      }
      const result = await accountService.purchaseAccount(
        req.user.userId,
        req.params.id
      );
      await auditService.logPurchase(req, result.order._id, req.params.id, result.order.amount);
      return responseUtils.success(
        res,
        result,
        "Account purchased successfully. Check your orders for login details."
      );
    } catch (error) {
      if (error.message === "Account not found") {
        return responseUtils.notFound(res, error.message);
      }
      if (
        error.message === "Account is not available" ||
        error.message === "Account is no longer available"
      ) {
        return responseUtils.conflict(res, error.message);
      }
      if (error.message.includes("Insufficient balance")) {
        return responseUtils.badRequest(res, error.message);
      }
      next(error);
    }
  },

  /**
   * ADMIN ONLY - Get all accounts with credentials
   * Used for admin management panel
   */
  async getAllAccountsWithCredentials(req, res, next) {
    try {
      const { accounts, meta } =
        await accountService.getAllAccountsWithCredentials(req.query);
      return responseUtils.successWithMeta(res, accounts, meta);
    } catch (error) {
      next(error);
    }
  },

  /**
   * ADMIN ONLY - Bulk delete accounts
   */
  async bulkDeleteAccounts(req, res, next) {
    try {
      const { ids } = req.body;
      const result = await accountService.bulkDeleteAccounts(ids);
      return responseUtils.success(
        res,
        result,
        `Deleted ${result.deletedCount} account(s) successfully`
      );
    } catch (error) {
      if (error.message.includes("must be a non-empty array")) {
        return responseUtils.badRequest(res, error.message);
      }
      next(error);
    }
  },

  /**
   * ADMIN ONLY - Add clone accounts to an existing account
   * POST /accounts/:id/clone-accounts
   */
  async bulkAddCloneAccounts(req, res, next) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return responseUtils.badRequest(res, "Invalid Account ID");
      }
      const { accounts } = req.body;
      const result = await accountService.bulkAddCloneAccounts(req.params.id, accounts);
      return responseUtils.success(
        res,
        result,
        `Added ${result.addedCount} clone accounts successfully`
      );
    } catch (error) {
      if (error.message === "Account not found") {
        return responseUtils.notFound(res, error.message);
      }
      if (error.message.includes("CLONE mode") || error.message.includes("must be a non-empty array")) {
        return responseUtils.badRequest(res, error.message);
      }
      next(error);
    }
  },

  /**
   * ADMIN ONLY - Get clone account credentials
   * GET /accounts/:id/clone-credentials
   */
  async getCloneAccountCredentials(req, res, next) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return responseUtils.badRequest(res, "Invalid Account ID");
      }
      const result = await accountService.getCloneAccountCredentials(req.params.id);
      return responseUtils.success(res, result);
    } catch (error) {
      if (error.message === "Account not found") {
        return responseUtils.notFound(res, error.message);
      }
      next(error);
    }
  },

  /**
   * ADMIN ONLY - Create a clone account with initial sub-accounts
   * POST /accounts/clone
   */
  async createCloneAccount(req, res, next) {
    try {
      const { accountData, cloneAccounts } = req.body;
      const result = await accountService.createCloneAccount(accountData, cloneAccounts);
      return responseUtils.success(
        res,
        result,
        "Clone account created successfully",
        201
      );
    } catch (error) {
      if (error.message === "Package not found") {
        return responseUtils.notFound(res, error.message);
      }
      if (error.message.includes("CLONE mode")) {
        return responseUtils.badRequest(res, error.message);
      }
      next(error);
    }
  },

  /**
   * ADMIN ONLY - Delete a single sub-account from a clone account
   * DELETE /accounts/:id/clone-accounts/:index
   */
  async deleteCloneSubAccount(req, res, next) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return responseUtils.badRequest(res, "Invalid Account ID");
      }
      const index = parseInt(req.params.index, 10);
      if (isNaN(index) || index < 0) {
        return responseUtils.badRequest(res, "Invalid index");
      }
      const result = await accountService.deleteCloneSubAccount(req.params.id, index);
      return responseUtils.success(res, result, "Sub-account deleted successfully");
    } catch (error) {
      if (error.message === "Account not found") {
        return responseUtils.notFound(res, error.message);
      }
      if (error.message.includes("not a clone account") || error.message.includes("Invalid index")) {
        return responseUtils.badRequest(res, error.message);
      }
      next(error);
    }
  },

  /**
   * USER - Purchase credentials from a specific clone account
   * POST /accounts/:id/clone-purchase
   */
  async purchaseCloneAccount(req, res, next) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return responseUtils.badRequest(res, "Invalid Account ID");
      }
      const { quantity = 1 } = req.body;

      // Debug logging
      console.log("[Controller] purchaseCloneAccount:", {
        accountId: req.params.id,
        userId: req.user?.userId,
        userIdType: typeof req.user?._id,
        quantity
      });

      const result = await accountService.purchaseCloneAccount(
        req.params.id,
        req.user.userId,
        quantity
      );
      return responseUtils.success(res, result, `Successfully purchased ${quantity} account(s)`);
    } catch (error) {
      if (error.message === "Account not found") {
        return responseUtils.notFound(res, error.message);
      }
      if (
        error.message.includes("not a clone account") ||
        error.message.includes("Quantity must be") ||
        error.message.includes("Insufficient balance") ||
        error.message.includes("not available") ||
        error.message.includes("Not enough sub-accounts") ||
        error.message.includes("Invalid account price")
      ) {
        return responseUtils.badRequest(res, error.message);
      }
      next(error);
    }
  },
};
