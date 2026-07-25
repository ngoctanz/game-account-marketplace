import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Account Model
 * Tài khoản game - thuộc về một Package cụ thể
 */
const accountSchema = new Schema(
  {
    packageId: {
      type: Schema.Types.ObjectId,
      ref: "AccountPackage",
      required: [true, "Package is required"],
      index: true,
    },
    code: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    accountInfo: {
      type: String,
      trim: true,
      maxlength: [500, "Account info cannot exceed 500 characters"],
      default: "",
    },
    price: {
      type: Number,
      min: [1, "Price must be at least 1"],
      default: 0,
      index: true,
      set: (val) => Math.max(1, Math.round(val)), // Always round to integer, min 1
    },
    originalPrice: {
      type: Number,
      default: null,
      min: [1, "Original price must be at least 1"],
      set: (val) => (val ? Math.max(1, Math.round(val)) : null), // Always round to integer, min 1
    },
    images: [{ type: String }],
    coverImage: { type: String, default: null },
    status: {
      type: String,
      enum: ["AVAILABLE", "SOLD", "LOCKED"],
      default: "AVAILABLE",
      index: true,
    },
    featuredSkins: [{ type: String }],
    // nếu là acc bình thường chỉ có thông tin credentials
    credentials: {
      username: {
        type: String,
        trim: true,
        required: [true, "Username is required"],
        select: false,
      },
      password: {
        type: String,
        required: [true, "Password is required"],
        select: false,
      },
      additionalInfo: {
        type: String,
        trim: true,
        default: null,
        select: false,
      },
    },

    // nếu là gói clone - nghĩa là acc reg có số lượng
    isClone: {
      type: Boolean,
      default: false,
    },
    quantity: {
      type: Number,
      min: [1, "Quantity must be at least 1"],
      default: 1,
      index: true,
    },
    // nếu là gói clone - nghĩa là acc reg có số lượng
    cloneAccounts: [{
      username: {
        type: String,
        trim: true,
        required: [true, "Username is required"],
        select: false,
      },
      password: {
        type: String,
        required: [true, "Password is required"],
        select: false,
      },
      additionalInfo: {
        type: String,
        trim: true,
        default: null,
        select: false,
      },
    }],

  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
accountSchema.index({ packageId: 1, status: 1 });
accountSchema.index({ packageId: 1, status: 1, price: 1 });
// Index for cleanup job (status + updatedAt)
accountSchema.index({ status: 1, updatedAt: 1 });
// Index for fast querying available accounts and sorting by newest
accountSchema.index({ status: 1, createdAt: -1 });
accountSchema.index({ status: 1, price: 1 });

// Virtuals
accountSchema.virtual("hasDiscount").get(function () {
  return this.originalPrice && this.originalPrice > this.price;
});

// Virtual to get typeId from package (for backward compatibility)
accountSchema.virtual("typeId", {
  ref: "AccountPackage",
  localField: "packageId",
  foreignField: "_id",
  justOne: true,
});

accountSchema.set("toJSON", { virtuals: true });
accountSchema.set("toObject", { virtuals: true });

accountSchema.pre("save", function (next) {
  if (!this.code) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let randomCode = "";
    for (let i = 0; i < 6; i++) {
      randomCode += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    this.code = randomCode;
  }
  next();
});

export const Account = mongoose.model("Account", accountSchema);
