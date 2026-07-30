import assert from "node:assert/strict";
import mongoose from "mongoose";
import { env } from "../src/config/environment.js";
import { Account } from "../src/models/account.model.js";
import { AccountPackage } from "../src/models/account-package.model.js";
import { AccountType } from "../src/models/account-type.model.js";
import { Order } from "../src/models/order.model.js";
import { Transaction } from "../src/models/transaction.model.js";
import { User } from "../src/models/user.model.js";
import { accountPackageService } from "../src/services/account-package.service.js";
import { accountService } from "../src/services/account.service.js";

const marker = `TXTEST_${Date.now()}`;
const created = { users: [], accounts: [], packages: [], type: null };

try {
  await mongoose.connect(env.MONGODB_URI);

  created.type = await AccountType.create({
    code: marker,
    name: marker,
  });
  created.packages = await AccountPackage.create([
    { typeId: created.type._id, title: `${marker} LIST`, mode: "LIST" },
    { typeId: created.type._id, title: `${marker} CLONE`, mode: "CLONE" },
  ]);
  created.users = await User.insertMany(
    Array.from({ length: 4 }, (_, index) => ({
      email: `${marker.toLowerCase()}_${index}@example.com`,
      password: "temporary-password",
      name: `${marker} User ${index}`,
      balance: index === 0 ? 0 : 100,
    }))
  );

  created.accounts = await Account.create([
    {
      packageId: created.packages[0]._id,
      code: `${marker}_ROLLBACK`,
      price: 10,
      credentials: { username: "rollback", password: "secret" },
    },
    {
      packageId: created.packages[0]._id,
      code: `${marker}_RACE`,
      price: 10,
      credentials: { username: "race", password: "secret" },
    },
    {
      packageId: created.packages[1]._id,
      code: `${marker}_CLONE`,
      price: 10,
      isClone: true,
      quantity: 4,
      credentials: { username: "container", password: "secret" },
      cloneAccounts: Array.from({ length: 4 }, (_, index) => ({
        username: `${marker}_credential_${index}`,
        password: "secret",
      })),
    },
  ]);

  await assert.rejects(
    accountService.purchaseAccount(
      created.users[0]._id,
      created.accounts[0]._id
    ),
    /Insufficient balance/
  );
  assert.equal(
    (await Account.findById(created.accounts[0]._id)).status,
    "AVAILABLE"
  );
  assert.equal(await Order.countDocuments({ accountId: created.accounts[0]._id }), 0);

  const listRace = await Promise.allSettled([
    accountService.purchaseAccount(created.users[1]._id, created.accounts[1]._id),
    accountService.purchaseAccount(created.users[2]._id, created.accounts[1]._id),
  ]);
  assert.equal(listRace.filter(({ status }) => status === "fulfilled").length, 1);
  assert.equal(await Order.countDocuments({ accountId: created.accounts[1]._id }), 1);

  const cloneRace = await Promise.all([
    accountPackageService.clonePurchaseBulk(
      created.packages[1]._id,
      created.users[2]._id,
      2
    ),
    accountPackageService.clonePurchaseBulk(
      created.packages[1]._id,
      created.users[3]._id,
      2
    ),
  ]);
  const cloneOrders = await Order.find({
    accountId: created.accounts[2]._id,
  }).select("+accountCredentials.username");
  assert.equal(cloneRace.flatMap(({ orders }) => orders).length, 4);
  assert.equal(
    new Set(cloneOrders.map(({ accountCredentials }) => accountCredentials.username))
      .size,
    4
  );
  const exhaustedClone = await Account.findById(created.accounts[2]._id);
  assert.equal(exhaustedClone.quantity, 0);
  assert.equal(exhaustedClone.status, "SOLD");

  console.log("Purchase transaction checks passed");
} finally {
  const userIds = created.users.map(({ _id }) => _id);
  await Transaction.deleteMany({ userId: { $in: userIds } }).catch(() => {});
  await Order.deleteMany({ userId: { $in: userIds } }).catch(() => {});
  await Account.deleteMany({
    _id: { $in: created.accounts.map(({ _id }) => _id) },
  }).catch(() => {});
  await AccountPackage.deleteMany({
    _id: { $in: created.packages.map(({ _id }) => _id) },
  }).catch(() => {});
  await User.deleteMany({ _id: { $in: userIds } }).catch(() => {});
  if (created.type) {
    await AccountType.deleteOne({ _id: created.type._id }).catch(() => {});
  }
  await mongoose.disconnect();
}
