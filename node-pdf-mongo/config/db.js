const { MongoClient } = require("mongodb");
require("dotenv").config({ path: "../.env" }); // Adjust path if .env is in project root

const mongoUri = process.env.MONGODB_URI;
let db;
let mongoClientInstance;

async function connectDB() {
  if (db) return { db, mongoClientInstance };
  try {
    mongoClientInstance = await MongoClient.connect(mongoUri);
    console.log("Connected to MongoDB");
    db = mongoClientInstance.db();
    return { db, mongoClientInstance };
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

function getDB() {
  if (!db) throw new Error("Database not initialized. Call connectDB first.");
  return db;
}

function getClient() {
  if (!mongoClientInstance)
    throw new Error("MongoDB client not initialized. Call connectDB first.");
  return mongoClientInstance;
}

module.exports = { connectDB, getDB, getClient };
