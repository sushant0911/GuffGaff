import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import path from "path";

import { connectDB } from "./lib/db.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT || 5001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const __dirname = path.resolve();

app.use(express.json());
app.use(cookieParser());
app.set("trust proxy", 1);
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:5173",
        CLIENT_URL,
      ].filter(Boolean);

      // allow non-browser requests or same-origin
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Health endpoint to help verify deployment and environment values
app.get("/api/health", (req, res) => {
  return res.status(200).json({
    ok: true,
    clientUrl: CLIENT_URL,
    nodeEnv: process.env.NODE_ENV || null,
  });
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

// In environments where long-lived sockets are supported (local or
// when ENABLE_SOCKETS=true) we listen with the HTTP server. In
// serverless environments (e.g. Vercel) we should NOT call listen.
const ENABLE_SOCKETS = process.env.ENABLE_SOCKETS === "true";

// Minimal environment sanity check: ensure at least one MongoDB URI is provided
const hasMongo = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URI_NON_SRV || process.env.MONGO_URI_NON_SRV;
if (!hasMongo) {
  console.error('No MongoDB connection string found. Set MONGODB_URI or MONGODB_URI_NON_SRV and restart.');
  // exit early to avoid confusing retries when env not configured
  process.exit(1);
}

if (ENABLE_SOCKETS || process.env.NODE_ENV !== "production") {
  server.listen(PORT, () => {
    console.log("server is running on PORT:" + PORT);
    connectDB();
  });
} else {
  // serverless / function environment: don't start the HTTP server here.
  // Connect DB once (connection caching will handle repeated calls).
  connectDB().then(() => {
    console.log("DB connected in serverless mode. Sockets disabled.");
  }).catch((e) => {
    console.error("DB connect error in serverless mode:", e.message || e);
  });
}

export default app;
