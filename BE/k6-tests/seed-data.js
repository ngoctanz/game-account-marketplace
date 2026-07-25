import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import fs from "fs";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || "default_secret";
const JWT_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "7d";

const userSchema = new mongoose.Schema({
  email: String,
  password: { type: String },
  name: String,
  role: { type: String, default: "USER" },
  status: { type: String, default: "active" },
  balance: { type: Number, default: 0 },
});
const User = mongoose.models.User || mongoose.model("User", userSchema);

const accountSchema = new mongoose.Schema({
  packageId: { type: mongoose.Schema.Types.ObjectId },
  code: String,
  price: Number,
  status: { type: String, default: "AVAILABLE" },
  credentials: {
    username: { type: String, default: "test_user" },
    password: { type: String, default: "test_pass" },
  }
});
const Account = mongoose.models.Account || mongoose.model("Account", accountSchema);

const packageSchema = new mongoose.Schema({
  title: String,
  game: String,
});
const AccountPackage = mongoose.models.AccountPackage || mongoose.model("AccountPackage", packageSchema);


const generateToken = (userId, role) => {
  return jwt.sign({ userId: userId.toString(), role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  
  console.log("Cleaning up old loadtest data...");
  await User.deleteMany({ email: { $regex: /loadtest/ } });
  await Account.deleteMany({ code: { $regex: /LT_/ } });
  await AccountPackage.deleteMany({ title: "LoadTest Package" });

  const hash = await bcrypt.hash("Password123!", 10);
  
  // 1. Create 100 users for Test B (Purchase flow)
  console.log("Creating 100 users for Test B...");
  const usersB = [];
  for (let i = 0; i < 100; i++) {
    usersB.push({
      email: `loadtest_b_${i}@test.com`,
      password: hash,
      name: `Load Test B ${i}`,
      balance: 100000000,
    });
  }
  const createdUsersB = await User.insertMany(usersB);
  const tokensB = createdUsersB.map(u => generateToken(u._id, u.role));

  // 2. Create 50 users for Test C1 (Race condition - Multiple users buy 1 account)
  console.log("Creating 50 users for Test C1...");
  const usersC1 = [];
  for (let i = 0; i < 50; i++) {
    usersC1.push({
      email: `loadtest_c1_${i}@test.com`,
      password: hash,
      name: `Load Test C1 ${i}`,
      balance: 100000000,
    });
  }
  const createdUsersC1 = await User.insertMany(usersC1);
  const tokensC1 = createdUsersC1.map(u => generateToken(u._id, u.role));

  // 3. Create 1 user for Test C2 (Race condition - 1 user buys multiple accounts)
  console.log("Creating 1 user for Test C2...");
  const userC2 = await User.create({
    email: `loadtest_c2@test.com`,
    password: hash,
    name: `Load Test C2`,
    balance: 500000, // Just enough for some
  });
  const tokenC2 = generateToken(userC2._id, userC2.role);

  const pkg = await AccountPackage.create({
    title: "LoadTest Package",
    game: "LIEN_QUAN"
  });

  // 4. Create 1000 Accounts for Test A, B
  console.log("Creating 1000 accounts...");
  const accounts = [];
  for (let i = 0; i < 1000; i++) {
    accounts.push({
      packageId: pkg._id,
      code: `LT_B_${i}`,
      price: 50000,
      status: "AVAILABLE",
    });
  }
  const createdAccounts = await Account.insertMany(accounts);
  const accountIds = createdAccounts.map(a => a._id.toString());
  
  // 5. Create 1 Target Account for Test C1
  const targetAccountC1 = await Account.create({
    packageId: pkg._id,
    code: `LT_C1_TARGET`,
    price: 50000,
    status: "AVAILABLE",
  });

  // 6. Create 150 Accounts for Test C2
  const accountsC2 = [];
  for (let i = 0; i < 150; i++) {
    accountsC2.push({
      packageId: pkg._id,
      code: `LT_C2_${i}`,
      price: 10000, // 50 purchases = 500k (exhausts balance of 500k)
      status: "AVAILABLE",
    });
  }
  const createdAccountsC2 = await Account.insertMany(accountsC2);
  const accountIdsC2 = createdAccountsC2.map(a => a._id.toString());

  const data = {
    testB: {
      tokens: tokensB,
      accountIds: accountIds.slice(0, 500), // First 500
    },
    testC1: {
      tokens: tokensC1,
      targetAccountId: targetAccountC1._id.toString(),
    },
    testC2: {
      token: tokenC2,
      userId: userC2._id.toString(),
      accountIds: accountIdsC2, // 150 accounts
    },
  };

  fs.writeFileSync("k6-data.json", JSON.stringify(data, null, 2));
  console.log("Created k6-data.json with test data!");
  
  mongoose.disconnect();
}

seed().catch(console.error);
