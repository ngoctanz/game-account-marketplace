import mongoose from "mongoose";

const { Schema } = mongoose;

const transactionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    type: {
      type: String,
      enum: ["purchase", "topup", "card_topup", "refund"],
      required: [true, "Transaction type is required"],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    balanceBefore: {
      type: Number,
      required: [true, "Balance before is required"],
      min: [0, "Balance before cannot be negative"],
    },
    balanceAfter: {
      type: Number,
      required: [true, "Balance after is required"],
      min: [0, "Balance after cannot be negative"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    referenceType: {
      type: String,
      enum: ["order", "batch", "topup", "card_topup", null],
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound indexes for common queries
transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ userId: 1, createdAt: -1 });

// Unique index to prevent duplicate topup credits
// Only one transaction per referenceId + referenceType combination for topups
transactionSchema.index(
  { referenceId: 1, referenceType: 1 },
  { 
    unique: true,
    partialFilterExpression: { 
      referenceType: { $in: ['topup', 'card_topup'] },
      referenceId: { $ne: null }
    }
  }
);

export const Transaction = mongoose.model("Transaction", transactionSchema);
