import { createClient } from "redis";
import { env } from "./environment.js";

let redisClient = null;
let isConnected = false;

export const initRedis = async () => {
  if (redisClient) return redisClient;

  // Use REDIS_URL from env, fallback to localhost
  const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";

  redisClient = createClient({ url });

  redisClient.on("error", (err) => {
    console.error("[Redis] Client Error:", err);
    isConnected = false;
  });

  redisClient.on("connect", () => {
    console.log("[Redis] Client Connected");
  });

  redisClient.on("ready", () => {
    console.log("[Redis] Client Ready");
    isConnected = true;
  });

  redisClient.on("end", () => {
    console.log("[Redis] Client Disconnected");
    isConnected = false;
  });

  try {
    await redisClient.connect();
    return redisClient;
  } catch (err) {
    console.error("[Redis] Connection failed:", err.message);
    // Return null so the app doesn't crash if Redis is unavailable
    return null;
  }
};

export const getRedisClient = () => {
  if (!isConnected || !redisClient) return null;
  return redisClient;
};
