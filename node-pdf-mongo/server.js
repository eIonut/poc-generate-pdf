require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const { connectDB, getClient } = require("./config/db");
const mainRoutes = require("./routes/index");

const app = express();
const port = process.env.SERVER_PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Connect to MongoDB and then start server
connectDB()
  .then(({ db }) => {
    // Mount routes
    app.use("/", mainRoutes);

    // Graceful shutdown
    process.on("SIGINT", async () => {
      console.log("Shutting down server...");
      const client = getClient();
      if (client) {
        await client.close();
        console.log("MongoDB connection closed.");
      }
      process.exit(0);
    });

    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
      if (!db) {
        console.warn(
          "NOTE: MongoDB connection is pending or failed. PDF functionality will be affected."
        );
      }
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB, server not started:", err);
    process.exit(1);
  });
