import { AccountPackage } from "../models/account-package.model.js";
import { Account } from "../models/account.model.js";
import { User } from "../models/user.model.js";
import { Order } from "../models/order.model.js";
import { Transaction } from "../models/transaction.model.js";
import mongoose from "mongoose";
import cloudinaryService from "./cloudinary.service.js";

const transactionOptions = {
  readPreference: "primary",
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" },
};

const buildAccountFilter = (pkg) => {
  return {
    packageId: pkg._id,
    status: "AVAILABLE",
  };
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

export const accountPackageService = {
  /**
   * Get all packages
   */
  async getAllPackages(query) {
    const { typeId, mode, isActive } = query;

    const filter = {};
    if (typeId) filter.typeId = typeId;
    if (mode) filter.mode = mode;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const packages = await AccountPackage.find(filter)
      .populate("typeId", "code name")
      .sort({ order: 1, createdAt: -1 });

    const packagesWithCount = await Promise.all(
      packages.map(async (pkg) => {
        const count = await Account.countDocuments(buildAccountFilter(pkg));
        return { ...pkg.toObject(), accountCount: count };
      })
    );

    return packagesWithCount;
  },

  /**
   * Get packages grouped by type
   */
  async getPackagesGroupedByType() {
    const packages = await AccountPackage.find({ isActive: true })
      .populate("typeId", "code name description")
      .sort({ order: 1 });

    const packagesWithCount = await Promise.all(
      packages.map(async (pkg) => {
        const count = await Account.countDocuments(buildAccountFilter(pkg));
        return { ...pkg.toObject(), accountCount: count };
      })
    );

    // Group by typeId (skip packages without typeId)
    const grouped = packagesWithCount.reduce((acc, pkg) => {
      if (!pkg.typeId?._id) return acc; // Skip if no typeId

      const typeId = pkg.typeId._id.toString();
      if (!acc[typeId]) {
        acc[typeId] = { type: pkg.typeId, packages: [] };
      }
      acc[typeId].packages.push(pkg);
      return acc;
    }, {});

    return Object.values(grouped);
  },

  /**
   * Get package by ID or Slug
   */
  async getPackageById(id) {
    let pkg = await AccountPackage.findById(id)
      .populate("typeId")
      .catch(() => null);
    if (!pkg)
      pkg = await AccountPackage.findOne({ slug: id }).populate("typeId");

    if (!pkg) {
      throw new Error("Package not found");
    }

    const accountCount = await Account.countDocuments(buildAccountFilter(pkg));

    return { ...pkg.toObject(), accountCount };
  },

  /**
   * Get accounts by package
   * Supports: page, limit, sort, search, minPrice, maxPrice
   */
  async getAccountsByPackage(id, query) {
    const { page = 1, limit = 20, sort = "price", search, minPrice, maxPrice } = query;

    let pkg = await AccountPackage.findById(id)
      .populate("typeId")
      .catch(() => null);
    if (!pkg)
      pkg = await AccountPackage.findOne({ slug: id }).populate("typeId");

    if (!pkg) {
      throw new Error("Package not found");
    }

    const sortOptions = {
      price: { price: 1 },
      "-price": { price: -1 },
      newest: { createdAt: -1 },
      default: { createdAt: -1 },
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter with search and price range
    const accountFilter = buildAccountFilter(pkg);

    // Search by code or featuredSkins
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: "i" };
      accountFilter.$or = [
        { code: searchRegex },
        { featuredSkins: searchRegex },
      ];
    }

    // Price range filter
    if (minPrice || maxPrice) {
      accountFilter.price = {};
      if (minPrice) accountFilter.price.$gte = parseFloat(minPrice);
      if (maxPrice) accountFilter.price.$lte = parseFloat(maxPrice);
    }

    const [accounts, total] = await Promise.all([
      Account.find(accountFilter)
        .populate({
          path: "packageId",
          populate: { path: "typeId", select: "code name" },
        })
        .sort(sortOptions[sort] || sortOptions.default)
        .skip(skip)
        .limit(parseInt(limit)),
      Account.countDocuments(accountFilter),
    ]);

    return {
      package: pkg,
      accounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  },

  /**
   * Create package
   */
  async createPackage(data) {
    // Ensure RANDOM/CLONE packages start with discountPrice = price (as requested)
    if (data.mode === "RANDOM" || data.mode === "CLONE") {
      data.discountPrice = data.price;
    }
    const pkg = await AccountPackage.create(data);
    await pkg.populate("typeId");
    return pkg;
  },

  /**
   * Update package
   */
  async updatePackage(id, data) {
    // Get current package to check for image change
    const currentPkg = await AccountPackage.findById(id);
    if (!currentPkg) {
      throw new Error("Package not found");
    }

    // Check if image is being changed (replaced or removed)
    const oldImage = currentPkg.image;
    const newImage = data.image;
    const imageChanged = "image" in data && oldImage && (!newImage || newImage !== oldImage);

    // For RANDOM/CLONE, prevent manual discountPrice update (managed by Discounts only)
    if (currentPkg.mode === "RANDOM" || currentPkg.mode === "CLONE") {
      delete data.discountPrice;
    }

    const pkg = await AccountPackage.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).populate("typeId");

    // Delete old image from Cloudinary if changed
    if (imageChanged) {
      const publicId = cloudinaryService.extractPublicId(oldImage);
      if (publicId) {
        cloudinaryService.deleteFile(publicId, "image").catch((err) => {
          console.error(`[Package] Failed to delete old image:`, err.message);
        });
      }
    }

    // Propagate price changes to AVAILABLE accounts for RANDOM/CLONE packages
    if (pkg.mode === "RANDOM" || pkg.mode === "CLONE") {
      if (pkg.discountPrice && pkg.discountPrice < pkg.price) {
        // Apply discount to all available accounts
        await Account.updateMany(
          { packageId: pkg._id, status: "AVAILABLE" },
          {
            $set: {
              price: pkg.discountPrice,
              originalPrice: pkg.price,
            },
          }
        );
      } else {
        // No discount or invalid discount, revert to normal price
        await Account.updateMany(
          { packageId: pkg._id, status: "AVAILABLE" },
          {
            $set: {
              price: pkg.price,
              originalPrice: null,
            },
          }
        );
      }
    }

    return pkg;
  },

  /**
   * Delete package
   * Note: Does NOT delete accounts in this package - they become orphaned
   * Use bulkDeleteAccounts separately if needed
   */
  async deletePackage(id) {
    const pkg = await AccountPackage.findById(id);
    if (!pkg) {
      throw new Error("Package not found");
    }

    // Check if package has accounts
    const accountCount = await Account.countDocuments({ packageId: id });
    if (accountCount > 0) {
      throw new Error(`Cannot delete package with ${accountCount} accounts. Delete accounts first.`);
    }

    // Delete image from Cloudinary
    if (pkg.image) {
      const publicId = cloudinaryService.extractPublicId(pkg.image);
      if (publicId) {
        try {
          await cloudinaryService.deleteFile(publicId, "image");
        } catch (error) {
          console.error(`[Package] Failed to delete Cloudinary image:`, error.message);
        }
      }
    }

    await AccountPackage.findByIdAndDelete(id);
    return pkg;
  },


  async randomPurchase(packageId, userId) {
    return this._executePurchase(packageId, userId, {
      sortAccount: undefined, // RANDOM: no specific sort, MongoDB default
      modeLabel: "Random",
      expectedMode: "RANDOM",
    });
  },

  /**
   * Clone purchase (CLONE mode only)
   * NEW LOGIC: Purchases take credentials from cloneAccounts array
   * Each clone account has many sub-accounts stored in cloneAccounts
   */
  async clonePurchase(packageId, userId) {
    return mongoose.connection.transaction(async (session) => {
      const pkg = await AccountPackage.findById(packageId)
        .session(session)
        .populate("typeId");

      if (!pkg) throw new Error("Package not found");
      if (pkg.mode !== "CLONE") {
        throw new Error(
          "Invalid package mode. This endpoint only supports CLONE packages."
        );
      }
      if (!pkg.isActive) throw new Error("Package is not active");

      const claimed = await claimCloneCredentials(
        {
          packageId: pkg._id,
          status: "AVAILABLE",
          isClone: true,
        },
        1,
        session
      );

      if (!claimed) throw new Error("No available accounts in this package");

      const cloneAccount = claimed.account;
      const claimedCredential = claimed.credentials[0];
      const purchasePrice = cloneAccount.price;
      if (purchasePrice == null || purchasePrice < 1) {
        throw new Error("Invalid account price");
      }

      const deductedUser = await User.findOneAndUpdate(
        { _id: userId, balance: { $gte: purchasePrice }, status: "active" },
        { $inc: { balance: -purchasePrice } },
        { new: true, session }
      );

      if (!deductedUser) {
        throw new Error("Insufficient balance or user not active");
      }

      const balanceBefore = deductedUser.balance + purchasePrice;
      const balanceAfter = deductedUser.balance;
      const [order] = await Order.create(
        [{
          userId,
          accountId: cloneAccount._id,
          price: purchasePrice,
          status: "completed",
          accountCredentials: {
            username: claimedCredential.username,
            password: claimedCredential.password,
            additionalInfo: claimedCredential.additionalInfo,
          },
          accountSnapshot: {
            code: cloneAccount.code || null,
            packageTitle: pkg.title || null,
            image: cloneAccount.coverImage || pkg.image || null,
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
          description: `Clone purchase from package "${pkg.title}"`,
          referenceId: order._id,
          referenceType: "order",
        }],
        { session }
      );

      return {
        success: true,
        order: {
          _id: order._id,
          price: order.price,
          status: order.status,
          createdAt: order.createdAt,
        },
        account: {
          _id: cloneAccount._id,
          code: cloneAccount.code,
          accountInfo: cloneAccount.accountInfo,
        },
        package: {
          _id: pkg._id,
          title: pkg.title,
          mode: pkg.mode,
        },
        balanceAfter,
      };
    }, transactionOptions);
  },

  /**
   * Bulk clone purchase (CLONE mode only)
   * NEW LOGIC: Purchases multiple credentials from cloneAccounts array of a single account
   */
  async clonePurchaseBulk(packageId, userId, quantity) {
    const MAX_QUANTITY = 10;
    const MIN_QUANTITY = 1;

    // Validate quantity
    const parsedQuantity = Number(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < MIN_QUANTITY || parsedQuantity > MAX_QUANTITY) {
      throw new Error(`Quantity must be an integer between ${MIN_QUANTITY} and ${MAX_QUANTITY}`);
    }
    quantity = parsedQuantity;

    return mongoose.connection.transaction(async (session) => {
      const pkg = await AccountPackage.findById(packageId)
        .session(session)
        .populate("typeId");

      if (!pkg) throw new Error("Package not found");
      if (pkg.mode !== "CLONE") {
        throw new Error(
          "Invalid package mode. This endpoint only supports CLONE packages."
        );
      }
      if (!pkg.isActive) throw new Error("Package is not active");

      const claimed = await claimCloneCredentials(
        {
          packageId: pkg._id,
          status: "AVAILABLE",
          isClone: true,
        },
        quantity,
        session
      );

      if (!claimed) {
        throw new Error(`Not enough accounts available. Required: ${quantity}`);
      }

      const cloneAccount = claimed.account;
      const unitPrice = cloneAccount.price;
      if (unitPrice == null || unitPrice < 1) {
        throw new Error("Invalid account price");
      }
      const totalPrice = unitPrice * quantity;
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
          code: cloneAccount.code || null,
          packageTitle: pkg.title || null,
          image: cloneAccount.coverImage || pkg.image || null,
        },
      }));
      const orders = await Order.insertMany(orderDocs, {
        session,
        ordered: true,
      });

      await Transaction.create(
        [{
          userId,
          type: "purchase",
          amount: totalPrice,
          balanceBefore,
          balanceAfter,
          description: `Bulk clone purchase: ${quantity} accounts from "${pkg.title}"`,
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
        orders: orders.map((o) => ({
          _id: o._id,
          price: o.price,
          status: o.status,
          createdAt: o.createdAt,
        })),
        package: {
          _id: pkg._id,
          title: pkg.title,
          mode: pkg.mode,
        },
        balanceAfter,
      };
    }, transactionOptions);
  },



  async _executePurchase(packageId, userId, options) {
    const { sortAccount, modeLabel, expectedMode } = options;

    return mongoose.connection.transaction(async (session) => {
      const pkg = await AccountPackage.findById(packageId)
        .session(session)
        .populate("typeId");

      if (!pkg) throw new Error("Package not found");
      if (pkg.mode !== expectedMode) {
        throw new Error(
          `Invalid package mode. This endpoint only supports ${expectedMode} packages.`
        );
      }
      if (!pkg.isActive) throw new Error("Package is not active");

      const purchasePrice = pkg.discountPrice ?? pkg.price;
      if (purchasePrice == null || purchasePrice < 1) {
        throw new Error("Invalid package price");
      }

      const selectedAccount = await Account.findOneAndUpdate(
        buildAccountFilter(pkg),
        { status: "SOLD" },
        {
          new: true,
          sort: sortAccount,
          session,
        }
      ).select(
        "+credentials.username +credentials.password +credentials.additionalInfo"
      );

      if (!selectedAccount) {
        throw new Error("No available accounts in this package");
      }
      if (!selectedAccount.credentials?.username) {
        throw new Error("Account credentials not found");
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
          accountId: selectedAccount._id,
          price: purchasePrice,
          status: "completed",
          accountCredentials: {
            username: selectedAccount.credentials.username,
            password: selectedAccount.credentials.password,
            additionalInfo: selectedAccount.credentials.additionalInfo,
          },
          accountSnapshot: {
            code: selectedAccount.code || null,
            packageTitle: pkg.title || null,
            image: pkg.image || null,
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
          description: `${modeLabel} purchase from package "${pkg.title}"`,
          referenceId: order._id,
          referenceType: "order",
        }],
        { session }
      );

      return {
        success: true,
        order: {
          _id: order._id,
          price: order.price,
          status: order.status,
          createdAt: order.createdAt,
        },
        account: {
          _id: selectedAccount._id,
          code: selectedAccount.code,
          accountInfo: selectedAccount.accountInfo,
          images: selectedAccount.images,
        },
        package: {
          _id: pkg._id,
          title: pkg.title,
          mode: pkg.mode,
        },
        balanceAfter,
      };
    }, transactionOptions);
  },

  /**
   * Bulk delete packages
   * Note: Only deletes packages that have no accounts
   */
  async bulkDeletePackages(packageIds) {
    if (!Array.isArray(packageIds) || packageIds.length === 0) {
      throw new Error("Package IDs must be a non-empty array");
    }

    // Check which packages have accounts
    const packagesWithAccounts = await Account.aggregate([
      { $match: { packageId: { $in: packageIds.map(id => mongoose.Types.ObjectId.createFromHexString(id)) } } },
      { $group: { _id: "$packageId", count: { $sum: 1 } } },
    ]);

    const packageIdsWithAccounts = new Set(packagesWithAccounts.map(p => p._id.toString()));
    const safeToDeleteIds = packageIds.filter(id => !packageIdsWithAccounts.has(id.toString()));

    if (safeToDeleteIds.length === 0) {
      throw new Error("All selected packages have accounts. Delete accounts first.");
    }

    // Get packages to delete their images
    const packages = await AccountPackage.find({ _id: { $in: safeToDeleteIds } });

    // Collect image public IDs
    const publicIds = [];
    for (const pkg of packages) {
      if (pkg.image) {
        const publicId = cloudinaryService.extractPublicId(pkg.image);
        if (publicId) publicIds.push(publicId);
      }
    }

    // Delete images from Cloudinary
    if (publicIds.length > 0) {
      try {
        await cloudinaryService.deleteFiles(publicIds, "image");
      } catch (error) {
        console.error(`[Package] Failed to delete Cloudinary images:`, error.message);
      }
    }

    const result = await AccountPackage.deleteMany({
      _id: { $in: safeToDeleteIds },
    });

    return {
      deletedCount: result.deletedCount,
      imagesDeleted: publicIds.length,
      skippedCount: packageIds.length - safeToDeleteIds.length,
      skippedReason: packageIdsWithAccounts.size > 0 ? "Some packages have accounts" : null,
    };
  },
};
