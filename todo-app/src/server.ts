import express from "express";
import cors from "cors";
import path from "path";
import taskRoutes from "./routes/tasks";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, "public")));

// API routes
app.use("/tasks", taskRoutes);

// Fallback: serve index.html for any non-API route
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Todo API running at http://localhost:${PORT}`);
  console.log(`   Open http://localhost:${PORT} in your browser to use the app.`);
});

export default app;
