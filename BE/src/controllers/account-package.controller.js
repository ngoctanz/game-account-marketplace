import { accountPackageService } from "../services/account-package.service.js";
import cloudinaryService from "../services/cloudinary.service.js";

/**
 * Get all packages
 */
export const getAllPackages = async (req, res) => {
  try {
    const data = await accountPackageService.getAllPackages(req.query);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get packages grouped by type (for homepage)
 */
export const getPackagesGroupedByType = async (req, res) => {
  try {
    const data = await accountPackageService.getPackagesGroupedByType();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get package by ID or slug
 */
export const getPackageById = async (req, res) => {
  try {
    const data = await accountPackageService.getPackageById(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    if (error.message === "Package not found") {
      return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get accounts by package (for LIST mode)
 */
export const getAccountsByPackage = async (req, res) => {
  try {
    const data = await accountPackageService.getAccountsByPackage(
      req.params.id,
      req.query
    );
    res.json({ success: true, data });
  } catch (error) {
    if (error.message === "Package not found") {
      return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create package (Admin)
 */
export const createPackage = async (req, res) => {
  try {
    if (req.file) {
      const result = await cloudinaryService.uploadBuffer(req.file.buffer, {
        folder: "account-packages",
      });
      req.body.image = result.url;
    }

    const pkg = await accountPackageService.createPackage(req.body);
    res.status(201).json({ success: true, data: pkg });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Update package (Admin)
 */
export const updatePackage = async (req, res) => {
  try {
    if (req.file) {
      const result = await cloudinaryService.uploadBuffer(req.file.buffer, {
        folder: "account-packages",
      });
      req.body.image = result.url;
    }

    const pkg = await accountPackageService.updatePackage(
      req.params.id,
      req.body
    );
    res.json({ success: true, data: pkg });
  } catch (error) {
    if (error.message === "Package not found") {
      return res.status(404).json({ success: false, message: error.message });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Delete package (Admin)
 */
export const deletePackage = async (req, res) => {
  try {
    await accountPackageService.deletePackage(req.params.id);
    res.json({ success: true, message: "Package deleted" });
  } catch (error) {
    if (error.message === "Package not found") {
      return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Random purchase (RANDOM mode only)
 * Purchases a random account from a RANDOM mode package.
 */
export const randomPurchase = async (req, res) => {
  try {
    const userId = req.user.userId;
    const data = await accountPackageService.randomPurchase(
      req.params.id,
      userId
    );

    res.json({
      success: true,
      data,
      message: "Random purchase successful!",
    });
  } catch (error) {
    if (error.message === "Package not found") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "No available accounts in this package") {
      return res.status(409).json({ success: false, message: error.message });
    }
    if (
      error.message.includes("Invalid package mode") ||
      error.message.includes("Insufficient balance") ||
      error.message === "Package is not active" ||
      error.message === "User account is not active"
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Clone purchase (CLONE mode only)
 * Purchases an account from a CLONE mode package.
 */
export const clonePurchase = async (req, res) => {
  try {
    const userId = req.user.userId;
    const data = await accountPackageService.clonePurchase(
      req.params.id,
      userId
    );

    res.json({
      success: true,
      data,
      message: "Clone purchase successful!",
    });
  } catch (error) {
    if (error.message === "Package not found") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "No available accounts in this package") {
      return res.status(409).json({ success: false, message: error.message });
    }
    if (
      error.message.includes("Invalid package mode") ||
      error.message.includes("Insufficient balance") ||
      error.message === "Package is not active" ||
      error.message === "User account is not active"
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Bulk clone purchase (CLONE mode only)
 * Purchases multiple accounts from a CLONE mode package.
 * Body: { quantity: number }
 */
export const clonePurchaseBulk = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { quantity } = req.body;

    const data = await accountPackageService.clonePurchaseBulk(
      req.params.id,
      userId,
      quantity
    );

    res.json({
      success: true,
      data,
      message: `Successfully purchased ${data.quantity} accounts!`,
    });
  } catch (error) {
    if (error.message === "Package not found") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message.includes("Not enough accounts")) {
      return res.status(409).json({ success: false, message: error.message });
    }
    if (
      error.message.includes("Invalid package mode") ||
      error.message.includes("Quantity must be") ||
      error.message.includes("Could only claim") ||
      error.message.includes("Insufficient balance") ||
      error.message === "Package is not active" ||
      error.message === "User account is not active"
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Bulk delete packages (Admin)
 */
export const bulkDeletePackages = async (req, res) => {
  try {
    const { ids } = req.body;
    const result = await accountPackageService.bulkDeletePackages(ids);
    res.json({
      success: true,
      data: result,
      message: `Deleted ${result.deletedCount} package(s) successfully`,
    });
  } catch (error) {
    if (error.message.includes("must be a non-empty array")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};
