import { Account } from "../models/account.model.js";
import { Order } from "../models/order.model.js";
import { User } from "../models/user.model.js";
import { Transaction } from "../models/transaction.model.js";
import { paginationUtils } from "../utils/pagination.util.js";
import { AccountPackage } from "../models/account-package.model.js";
import cloudinaryService from "./cloudinary.service.js";
import mongoose from "mongoose";

const transactionOptions = {
  readPreference: "primary",
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" },
};

const claimCloneCredentials = async (filter, quantity, session) => {
  const account = await Account.findOneAndUpdate(
    {
      ...filter,
      quantity: { $gte: quantity },
      [`cloneAccounts.${quantity - 1}`]: { $exists: true },
    },
    [
      {
        $set: {
          cloneAccounts: {
            $slice: ["$cloneAccounts", quantity, { $size: "$cloneAccounts" }],
          },
          quantity: {
            $subtract: [{ $size: "$cloneAccounts" }, quantity],
          },
          status: {
            $cond: [
              { $lte: [{ $size: "$cloneAccounts" }, quantity] },
              "SOLD",
              "$status",
            ],
          },
        },
      },
    ],
    { new: false, session }
  ).select(
    "+cloneAccounts.username +cloneAccounts.password +cloneAccounts.additionalInfo"
  );

  if (!account) return null;

  return {
    account,
    credentials: account.cloneAccounts.slice(0, quantity),
    remainingQuantity: account.cloneAccounts.length - quantity,
  };
};

/**
 * Helper: Extract and delete Cloudinary images from account
 */
const deleteAccountImages = async (account) => {
  const publicIds = [];

  if (account.coverImage) {
    const publicId = cloudinaryService.extractPublicId(account.coverImage);
    if (publicId) publicIds.push(publicId);
  }

  if (account.images && account.images.length > 0) {
    for (const imageUrl of account.images) {
      const publicId = cloudinaryService.extractPublicId(imageUrl);
      if (publicId) publicIds.push(publicId);
    }
  }

  if (publicIds.length > 0) {
    try {
      await cloudinaryService.deleteFiles(publicIds, "image");
    } catch (error) {
      console.error(`[Account] Failed to delete Cloudinary images:`, error.message);
    }
  }

  return publicIds.length;
};

/**
 * Helper: Delete specific image URLs from Cloudinary
 */
const deleteImageUrls = async (imageUrls) => {
  if (!imageUrls || imageUrls.length === 0) return;

  const publicIds = [];
  for (const url of imageUrls) {
    const publicId = cloudinaryService.extractPublicId(url);
    if (publicId) publicIds.push(publicId);
  }

  if (publicIds.length > 0) {
    try {
      await cloudinaryService.deleteFiles(publicIds, "image");
    } catch (error) {
      console.error(`[Account] Failed to delete Cloudinary images:`, error.message);
    }
  }
};

export const accountService = {
  /**
   * PUBLIC - Get all accounts
   */
  async getAllAccounts(query) {
    const { page, limit, skip } = paginationUtils.getPaginationParams(query);

    const filter = { status: "AVAILABLE" };

    // Support both packageId and typeId (backward compatible)
    if (query.packageId) {
      filter.packageId = query.packageId;
    } else if (query.typeId) {
      // Find packages with this typeId
      const packages = await AccountPackage.find({ typeId: query.typeId }).select("_id");
      filter.packageId = { $in: packages.map(p => p._id) };
    }

    if (query.status) filter.status = query.status;
    if (query.minPrice)
      filter.price = { ...filter.price, $gte: parseFloat(query.minPrice) };
    if (query.maxPrice)
      filter.price = { ...filter.price, $lte: parseFloat(query.maxPrice) };
    if (query.search) {
      filter.$or = [
        { code: { $regex: query.search, $options: "i" } },
        { featuredSkins: { $regex: query.search, $options: "i" } }
      ];
    }

    const sortOptions = {};
    if (query.sortBy === "price_asc") {
      sortOptions.price = 1;
    } else if (query.sortBy === "price_desc") {
      sortOptions.price = -1;
    } else if (query.sortBy === "createdAt_asc") {
      sortOptions.createdAt = 1;
    } else if (query.sortBy === "createdAt_desc") {
      sortOptions.createdAt = -1;
    } else {
      // Default: newest first
      sortOptions.createdAt = -1;
    }

    const [accounts, total] = await Promise.all([
      Account.find(filter)
        .populate({
          path: "packageId",
          populate: { path: "typeId", select: "code name" },
        })
        .sort(sortOptions)
        .skip(skip)
        .limit(limit),
      Account.countDocuments(filter),
    ]);

    return {
      accounts,
      meta: paginationUtils.createPaginationMeta(page, limit, total),
    };
  },

  /**
   * PUBLIC - Get account by ID
   */
  async getAccountById(accountId) {
    const account = await Account.findById(accountId).populate({
      path: "packageId",
      populate: { path: "typeId", select: "code name" },
    });
    if (!account) throw new Error("Account not found");

    return account;
  },

  /**
   * ADMIN - Get account with credentials
   */
  async getAccountByIdWithCredentials(accountId) {
    const account = await Account.findById(accountId)
      .select(
        "+credentials.username +credentials.password +credentials.additionalInfo"
      )
      .populate({
        path: "packageId",
        populate: { path: "typeId", select: "code name" },
      });
    if (!account) throw new Error("Account not found");
    return account;
  },

  /**
   * ADMIN - Create account
   */
  async createAccount(accountData) {
    if (
      !accountData.credentials?.username ||
      !accountData.credentials?.password
    ) {
      throw new Error("Credentials (username and password) are required");
    }

    // Convert typeId to packageId if provided (for backward compatibility)
    if (accountData.typeId && !accountData.packageId) {
      // Find package by typeId
      const accountPackage = await AccountPackage.findOne({ typeId: accountData.typeId });
      if (!accountPackage) throw new Error("Package not found for this type");
      accountData.packageId = accountPackage._id;
      delete accountData.typeId;
    }

    if (!accountData.packageId) throw new Error("Package is required");
    if (!accountData.accountInfo) throw new Error("Account info is required");

    // Validate package exists
    const accountPackage = await AccountPackage.findById(accountData.packageId);
    if (!accountPackage) throw new Error("Package not found");

    // Handle price logic based on package mode
    if (accountPackage.mode === "RANDOM" || accountPackage.mode === "CLONE") {
      // For RANDOM/CLONE, strictly use package prices (security & consistency)
      // Always prioritize discountPrice if available
      accountData.price = accountPackage.discountPrice ?? accountPackage.price;

      // Set originalPrice only if there is a real discount (discountPrice < price)
      if (accountPackage.discountPrice != null && accountPackage.discountPrice < accountPackage.price) {
        accountData.originalPrice = accountPackage.price;
      } else {
        accountData.originalPrice = null;
      }
    } else {
      // For LIST mode, respect provided price but check for active discounts
      const { Discount } = await import("../models/index.js");
      const activeDiscount = await Discount.findOne({
        applicablePackages: accountPackage._id,
        isActive: true,
        $or: [{ endDate: { $gte: new Date() } }, { endDate: null }],
      });

      // If discount exists and price is set, apply discount
      if (activeDiscount && accountData.price) {
        accountData.originalPrice = accountData.price;
        accountData.price = Math.max(1, Math.round(
          accountData.price * (1 - activeDiscount.discountPercent / 100)
        ));
      }
    }

    return Account.create(accountData);
  },

  /**
   * ADMIN - Bulk create accounts
   */
  async bulkCreateAccounts(accountsData) {
    if (!Array.isArray(accountsData) || accountsData.length === 0) {
      throw new Error("Accounts data must be a non-empty array");
    }

    // Limit bulk create to prevent DoS
    const MAX_BULK_CREATE = 500;
    if (accountsData.length > MAX_BULK_CREATE) {
      throw new Error(`Maximum ${MAX_BULK_CREATE} accounts per bulk create`);
    }

    // Validate and prepare data
    const preparedAccounts = [];

    // Cache packages to avoid repeated DB calls
    const packageCache = new Map();

    for (const data of accountsData) {
      if (!data.credentials?.username || !data.credentials?.password) {
        continue; // Skip invalid rows
      }

      if (!data.packageId) {
        throw new Error("Missing packageId for some accounts");
      }

      let pkg;
      // Check if packageId is valid
      if (packageCache.has(data.packageId)) {
        pkg = packageCache.get(data.packageId);
      } else {
        pkg = await AccountPackage.findById(data.packageId);
        if (pkg) packageCache.set(data.packageId, pkg);
      }

      if (!pkg) {
        throw new Error(`Package not found for ID: ${data.packageId}`);
      }

      // Generate pseudo-random code (insertMany bypasses pre-save hooks)
      const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let randomCode = "";
      for (let i = 0; i < 6; i++) {
        randomCode += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      const account = {
        packageId: data.packageId,
        code: randomCode,
        accountInfo: data.accountInfo || pkg.title, // Default to package title
        credentials: {
          username: data.credentials.username,
          password: data.credentials.password,
          additionalInfo: data.credentials.additionalInfo
        },
        status: "AVAILABLE",
        price: pkg.discountPrice ?? pkg.price,
        originalPrice: (pkg.discountPrice != null && pkg.discountPrice < pkg.price) ? pkg.price : null,
        image: pkg.image // Inherit image from package
      };
      preparedAccounts.push(account);
    }

    if (preparedAccounts.length === 0) {
      throw new Error("No valid accounts found to create");
    }

    // Use insertMany for bulk creation
    return Account.insertMany(preparedAccounts);
  },

  /**
   * ADMIN - Update account
   */
  async updateAccount(accountId, updateData) {
    // Get current account first to check package and images
    const currentAccount = await Account.findById(accountId);
    if (!currentAccount) throw new Error("Account not found");

    // Determine effective Package ID (new or existing)
    const packageId = updateData.packageId || currentAccount.packageId;

    if (packageId) {
      const pkg = await AccountPackage.findById(packageId);
      if (pkg) {
        // Auto-update price for RANDOM/CLONE packages based on package price/discount
        if (pkg.mode === "RANDOM" || pkg.mode === "CLONE") {
          updateData.price = pkg.discountPrice ?? pkg.price;
          if (pkg.discountPrice != null && pkg.discountPrice < pkg.price) {
            updateData.originalPrice = pkg.price;
          } else {
            updateData.originalPrice = null;
          }
        } else if (pkg.mode === "LIST") {
          let basePrice = updateData.price;

          // If price is NOT in updateData, try to infer base price from existing account
          if (basePrice === undefined) {
            // If originalPrice exists, it was the base. If not, price was the base.
            basePrice = currentAccount.originalPrice || currentAccount.price;
          }

          // Check for active specific package discounts
          const { Discount } = await import("../models/index.js");
          const activeDiscount = await Discount.findOne({
            applicablePackages: pkg._id,
            isActive: true,
            $or: [{ endDate: { $gte: new Date() } }, { endDate: null }],
          });

          if (activeDiscount && basePrice) {
            updateData.originalPrice = basePrice;
            updateData.price = Math.max(1, Math.round(basePrice * (1 - activeDiscount.discountPercent / 100)));
          } else {
            // No discount: price is base, original is null
            updateData.price = basePrice;
            updateData.originalPrice = null; // Explicitly clear originalPrice if discount ends
          }
        }
      }
    }

    // Collect old images to delete
    const imagesToDelete = [];

    // Check if coverImage is being changed (replaced or removed)
    if ("coverImage" in updateData && currentAccount.coverImage) {
      if (!updateData.coverImage || updateData.coverImage !== currentAccount.coverImage) {
        imagesToDelete.push(currentAccount.coverImage);
      }
    }

    // Check if images array is being changed - find removed images
    if ("images" in updateData && currentAccount.images) {
      const newImages = updateData.images || [];
      const newImagesSet = new Set(newImages);
      for (const oldImage of currentAccount.images) {
        if (!newImagesSet.has(oldImage)) {
          imagesToDelete.push(oldImage);
        }
      }
    }

    const account = await Account.findByIdAndUpdate(accountId, updateData, {
      new: true,
      runValidators: true,
    }).populate({
      path: "packageId",
      populate: { path: "typeId", select: "code name" },
    });

    // Delete old images from Cloudinary (in background)
    if (imagesToDelete.length > 0) {
      deleteImageUrls(imagesToDelete);
    }

    return account;
  },

  /**
   * ADMIN - Delete account
   */
  async deleteAccount(accountId) {
    const account = await Account.findById(accountId);
    if (!account) throw new Error("Account not found");

    // Delete images from Cloudinary
    await deleteAccountImages(account);

    // Delete account from database
    await Account.findByIdAndDelete(accountId);

    return account;
  },

  /**
   * USER - Purchase account (LIST mode)
   * Inventory, balance, order and transaction log commit atomically.
   */
  async purchaseAccount(userId, accountId) {
    return mongoose.connection.transaction(async (session) => {
      const account = await Account.findById(accountId)
        .session(session)
        .select(
          "+credentials.username +credentials.password +credentials.additionalInfo"
        )
        .populate("packageId");

      if (!account) throw new Error("Account not found");
      if (account.status !== "AVAILABLE") {
        throw new Error("Account is not available");
      }

      const pkg = account.packageId;
      if (!pkg) throw new Error("Account package not found");
      if (pkg.mode !== "LIST") {
        throw new Error("This account can only be purchased through random draw");
      }
      if (!account.credentials?.username) {
        throw new Error("Account credentials not found");
      }

      const purchasePrice = account.price;
      const claimedAccount = await Account.findOneAndUpdate(
        { _id: accountId, status: "AVAILABLE" },
        { status: "SOLD" },
        { new: true, session }
      );

      if (!claimedAccount) {
        throw new Error("Account is no longer available");
      }

      const updatedUser = await User.findOneAndUpdate(
        {
          _id: userId,
          balance: { $gte: purchasePrice },
          status: "active"
        },
        { $inc: { balance: -purchasePrice } },
        { new: true, session }
      );

      if (!updatedUser) {
        throw new Error("Insufficient balance or user not active");
      }

      const balanceBefore = updatedUser.balance + purchasePrice;
      const balanceAfter = updatedUser.balance;
      const [order] = await Order.create(
        [{
          userId,
          accountId,
          price: purchasePrice,
          status: "completed",
          accountCredentials: {
            username: account.credentials.username,
            password: account.credentials.password,
            additionalInfo: account.credentials.additionalInfo,
          },
          accountSnapshot: {
            code: account.code || null,
            packageTitle: pkg.title || null,
            image: account.coverImage || account.images?.[0] || null,
          },
        }],
        { session }
      );

      await Transaction.create(
        [{
          userId,
          type: "purchase",
          amount: purchasePrice,
          balanceBefore,
          balanceAfter,
          description: `Purchased account #${account._id}`,
          referenceId: order._id,
          referenceType: "order",
        }],
        { session }
      );

      return { order, balanceAfter };
    }, transactionOptions);
  },

  /**
   * ADMIN - Get all accounts with credentials
   */
  async getAllAccountsWithCredentials(query) {
    const { page, limit, skip } = paginationUtils.getPaginationParams(query);

    const filter = {};
    if (query.packageId) filter.packageId = query.packageId;
    if (query.status) filter.status = query.status;

    // Filter by mode (LIST, RANDOM, or CLONE)
    if (query.mode) {
      const packages = await AccountPackage.find({ mode: query.mode }).select(
        "_id"
      );
      const packageIds = packages.map((p) => p._id);

      // If no packages match the mode, no accounts can be found
      if (packageIds.length === 0) {
        return {
          accounts: [],
          meta: paginationUtils.createPaginationMeta(page, limit, 0),
        };
      }

      if (filter.packageId) {
        // Check if requested packageId is in the mode filter
        const isAllowed = packageIds.some(
          (id) => id.toString() === filter.packageId.toString()
        );
        if (!isAllowed) {
          return {
            accounts: [],
            meta: paginationUtils.createPaginationMeta(page, limit, 0),
          };
        }
      } else {
        filter.packageId = { $in: packageIds };
      }
    }

    const [accounts, total] = await Promise.all([
      Account.find(filter)
        .select(
          "+credentials.username +credentials.password +credentials.additionalInfo"
        )
        .populate({
          path: "packageId",
          populate: { path: "typeId", select: "code name" },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Account.countDocuments(filter),
    ]);

    return {
      accounts,
      meta: paginationUtils.createPaginationMeta(page, limit, total),
    };
  },

  /**
   * ADMIN - Bulk delete accounts
   */
  async bulkDeleteAccounts(accountIds) {
    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      throw new Error("Account IDs must be a non-empty array");
    }

    // Get accounts to delete their images
    const accounts = await Account.find({ _id: { $in: accountIds } });

    // Collect all image public IDs
    const allPublicIds = [];
    for (const account of accounts) {
      if (account.coverImage) {
        const publicId = cloudinaryService.extractPublicId(account.coverImage);
        if (publicId) allPublicIds.push(publicId);
      }
      if (account.images && account.images.length > 0) {
        for (const imageUrl of account.images) {
          const publicId = cloudinaryService.extractPublicId(imageUrl);
          if (publicId) allPublicIds.push(publicId);
        }
      }
    }

    // Delete images from Cloudinary (in batches of 100)
    if (allPublicIds.length > 0) {
      try {
        for (let i = 0; i < allPublicIds.length; i += 100) {
          const batch = allPublicIds.slice(i, i + 100);
          await cloudinaryService.deleteFiles(batch, "image");
        }
      } catch (error) {
        console.error(`[Account] Failed to delete Cloudinary images:`, error.message);
      }
    }

    const result = await Account.deleteMany({ _id: { $in: accountIds } });
    return { deletedCount: result.deletedCount, imagesDeleted: allPublicIds.length };
  },

  /**
   * ADMIN - Add clone accounts to an existing clone account
   * Used for uploading multiple credentials to a single clone account
   */
  async bulkAddCloneAccounts(accountId, cloneAccountsData) {
    if (!Array.isArray(cloneAccountsData) || cloneAccountsData.length === 0) {
      throw new Error("Clone accounts data must be a non-empty array");
    }

    const MAX_BULK_ADD = 500;
    if (cloneAccountsData.length > MAX_BULK_ADD) {
      throw new Error(`Maximum ${MAX_BULK_ADD} clone accounts per upload`);
    }

    const account = await Account.findById(accountId).populate("packageId");
    if (!account) throw new Error("Account not found");

    // Validate package is CLONE mode
    if (!account.packageId || account.packageId.mode !== "CLONE") {
      throw new Error("This operation is only valid for CLONE mode accounts");
    }

    // Prepare valid clone accounts
    const validCloneAccounts = cloneAccountsData
      .filter(acc => acc.username && acc.password)
      .map(acc => ({
        username: acc.username,
        password: acc.password,
        additionalInfo: acc.additionalInfo || null,
      }));

    if (validCloneAccounts.length === 0) {
      throw new Error("No valid clone accounts found (need username and password)");
    }

    // Add to cloneAccounts array and update quantity
    const updatedAccount = await Account.findByIdAndUpdate(
      accountId,
      {
        $push: { cloneAccounts: { $each: validCloneAccounts } },
        $inc: { quantity: validCloneAccounts.length },
        $set: { isClone: true, status: "AVAILABLE" }
      },
      { new: true }
    ).populate({
      path: "packageId",
      populate: { path: "typeId", select: "code name" },
    });

    return {
      account: updatedAccount,
      addedCount: validCloneAccounts.length,
    };
  },

  /**
   * ADMIN - Get clone account credentials for a specific account
   * Returns all cloneAccounts with their credentials
   */
  async getCloneAccountCredentials(accountId) {
    const account = await Account.findById(accountId)
      .select("+cloneAccounts.username +cloneAccounts.password +cloneAccounts.additionalInfo")
      .populate({
        path: "packageId",
        populate: { path: "typeId", select: "code name" },
      });

    if (!account) throw new Error("Account not found");

    return {
      account: {
        _id: account._id,
        code: account.code,
        accountInfo: account.accountInfo,
        price: account.price,
        quantity: account.quantity,
        isClone: account.isClone,
        packageId: account.packageId,
      },
      cloneAccounts: account.cloneAccounts || [],
      totalCount: account.cloneAccounts?.length || 0,
    };
  },

  /**
   * ADMIN - Create a clone account with initial cloneAccounts array
   */
  async createCloneAccount(accountData, cloneAccountsData = []) {
    // Validate package is CLONE mode
    const pkg = await AccountPackage.findById(accountData.packageId);
    if (!pkg) throw new Error("Package not found");
    if (pkg.mode !== "CLONE") throw new Error("Package must be CLONE mode");

    // Prepare clone accounts
    const validCloneAccounts = cloneAccountsData
      .filter(acc => acc.username && acc.password)
      .map(acc => ({
        username: acc.username,
        password: acc.password,
        additionalInfo: acc.additionalInfo || null,
      }));

    // Create the account with isClone flag and cloneAccounts
    const newAccount = await Account.create({
      packageId: accountData.packageId,
      accountInfo: accountData.accountInfo || pkg.title,
      price: accountData.price || 0,
      originalPrice: accountData.originalPrice || null,
      coverImage: accountData.coverImage || pkg.image,
      images: accountData.images || (pkg.image ? [pkg.image] : []),
      isClone: true,
      quantity: validCloneAccounts.length,
      cloneAccounts: validCloneAccounts,
      credentials: {
        username: "clone_account",
        password: "see_clone_accounts",
        additionalInfo: "This is a clone account with multiple sub-accounts",
      },
      status: validCloneAccounts.length > 0 ? "AVAILABLE" : "LOCKED",
    });

    return newAccount;
  },

  /**
   * ADMIN - Delete a single clone sub-account by index
   */
  async deleteCloneSubAccount(accountId, index) {
    const account = await Account.findById(accountId)
      .select("+cloneAccounts")
      .populate("packageId");

    if (!account) {
      throw new Error("Account not found");
    }

    if (!account.isClone || !account.cloneAccounts) {
      throw new Error("This is not a clone account");
    }

    if (index < 0 || index >= account.cloneAccounts.length) {
      throw new Error("Invalid index");
    }

    // Remove the sub-account at index
    account.cloneAccounts.splice(index, 1);
    account.quantity = account.cloneAccounts.length;

    // Mark as SOLD if no more sub-accounts
    if (account.cloneAccounts.length === 0) {
      account.status = "SOLD";
    }

    await account.save();

    return {
      success: true,
      remainingCount: account.cloneAccounts.length,
    };
  },

  /**
   * Purchase credentials from a specific clone account
   * @param accountId - The clone account ID
   * @param userId - The purchasing user ID
   * @param quantity - Number of credentials to purchase (1-10)
   */
  async purchaseCloneAccount(accountId, userId, quantity) {
    const MAX_QUANTITY = 10;
    const MIN_QUANTITY = 1;

    // Validate quantity
    const parsedQuantity = Number(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < MIN_QUANTITY || parsedQuantity > MAX_QUANTITY) {
      throw new Error(`Quantity must be an integer between ${MIN_QUANTITY} and ${MAX_QUANTITY}`);
    }
    quantity = parsedQuantity;

    return mongoose.connection.transaction(async (session) => {
      const cloneAccount = await Account.findById(accountId)
        .session(session)
        .select(
          "+cloneAccounts.username +cloneAccounts.password +cloneAccounts.additionalInfo"
        )
        .populate({
          path: "packageId",
          select: "title mode typeId image",
          populate: { path: "typeId", select: "code name" }
        });

      if (!cloneAccount) throw new Error("Account not found");
      if (!cloneAccount.isClone) throw new Error("This is not a clone account");
      if (cloneAccount.status !== "AVAILABLE") {
        throw new Error("This account is not available for purchase");
      }
      if (cloneAccount.cloneAccounts.length < quantity) {
        throw new Error(
          `Not enough sub-accounts available. Required: ${quantity}, Available: ${cloneAccount.cloneAccounts.length}`
        );
      }

      const unitPrice = cloneAccount.price;
      if (unitPrice == null || unitPrice < 1) {
        throw new Error("Invalid account price");
      }
      const totalPrice = unitPrice * quantity;
      const claimed = await claimCloneCredentials(
        { _id: accountId, status: "AVAILABLE", isClone: true },
        quantity,
        session
      );

      if (!claimed) throw new Error("Account is no longer available");

      const deductedUser = await User.findOneAndUpdate(
        { _id: userId, balance: { $gte: totalPrice }, status: "active" },
        { $inc: { balance: -totalPrice } },
        { new: true, session }
      );

      if (!deductedUser) {
        throw new Error("Insufficient balance or user not active");
      }

      const batchId = new mongoose.Types.ObjectId().toString();
      const balanceBefore = deductedUser.balance + totalPrice;
      const balanceAfter = deductedUser.balance;
      const orderDocs = claimed.credentials.map((credential) => ({
        userId,
        accountId: cloneAccount._id,
        price: unitPrice,
        status: "completed",
        batchId,
        accountCredentials: {
          username: credential.username,
          password: credential.password,
          additionalInfo: credential.additionalInfo,
        },
        accountSnapshot: {
          code: cloneAccount.code,
          image: cloneAccount.coverImage || cloneAccount.packageId?.image,
          packageTitle: cloneAccount.packageId?.title,
        },
      }));
      const orders = await Order.insertMany(orderDocs, { session, ordered: true });

      await Transaction.create(
        [{
          userId,
          type: "purchase",
          amount: totalPrice,
          balanceBefore,
          balanceAfter,
          description: `Clone purchase: ${quantity}x "${cloneAccount.packageId?.title || cloneAccount.accountInfo}"`,
          referenceId: batchId,
          referenceType: "batch",
        }],
        { session }
      );

      return {
        success: true,
        batchId,
        quantity,
        totalPrice,
        unitPrice,
        orders: orders.map(o => ({
          _id: o._id,
          price: o.price,
          status: o.status,
          createdAt: o.createdAt,
          accountCode: cloneAccount.code,
        })),
        account: {
          _id: cloneAccount._id,
          code: cloneAccount.code,
          accountInfo: cloneAccount.accountInfo,
          remainingQuantity: claimed.remainingQuantity,
        },
        package: {
          _id: cloneAccount.packageId?._id,
          title: cloneAccount.packageId?.title,
          mode: "CLONE",
        },
        balanceAfter,
      };
    }, transactionOptions);
  },
};
