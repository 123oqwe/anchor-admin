/**
 * Anchor OS — Admin Panel Server (port 3001)
 * Separate process from user product. Shares same SQLite database.
 * NO cron jobs, NO WebSocket, NO Telegram. Pure admin API + UI.
 */
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

// Import DB (connects to same anchor.db)
import "./infra/storage/db.js";

// Admin routes
import adminRoutes from "./routes/admin.js";
import graphRoutes from "./routes/graph.js";
import memoryRoutes from "./routes/memory.js";
import twinRoutes from "./routes/twin.js";
import agentsRoutes from "./routes/agents.js";
import customAgentsRoutes from "./routes/custom-agents.js";
import privacyRoutes from "./routes/privacy.js";
import cronsRoutes from "./routes/crons.js";
import skillsRoutes from "./routes/skills.js";
import userRoutes from "./routes/user.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

app.use(express.json());

// CORS: allow admin panel to call user product APIs if needed
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Mount API routes (same as user product — admin reads same data)
app.use("/api/admin", adminRoutes);
app.use("/api/graph", graphRoutes);
app.use("/api/memory", memoryRoutes);
app.use("/api/twin", twinRoutes);
app.use("/api/agents", agentsRoutes);
app.use("/api/agents", customAgentsRoutes);
app.use("/api/privacy", privacyRoutes);
app.use("/api/crons", cronsRoutes);
app.use("/api/skills", skillsRoutes);
app.use("/api/user", userRoutes);

// Static / SPA — serve admin frontend
const staticPath = path.resolve(__dirname, "..", "dist", "admin");
app.use(express.static(staticPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(staticPath, "index.html"));
});

const port = process.env.ADMIN_PORT || 3001;
server.listen(port, () => {
  console.log(`🔧 Anchor Admin Panel on http://localhost:${port}/`);
});
