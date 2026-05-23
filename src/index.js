require("dotenv").config();
require("express-async-errors");

const express = require("express");
const app = express();

const authMiddleware = require("./middleware/auth");
const rateLimiter = require("./middleware/rateLimiter");
const circuitBreaker = require("./middleware/circuitBreaker");
const proxyRequest = require("./core/proxy");
const { loadRoutes } = require("./core/router");
const adminRoutes = require("./routes/admin");
const logger = require("./core/logger");
const cors = require("cors");
// app.use(
//   cors({
//     origin: [
//       "http://localhost:3000",
//       "https://gateway-dashboard-eta.vercel.app/",
//     ],
//   }),
// );

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

// Admin API- no auth, manages route config
app.use("/admin", adminRoutes);

// Main gateway pipeline
app.use(async (req, res, next) => {
  try {
    const route = await loadRoutes(req); // 1. match route
    if (!route) return res.status(404).json({ error: "Route not found" });

    req.route = route;

    await authMiddleware(
      req,
      res,
      async () =>
        await rateLimiter(
          req,
          res,
          async () =>
            await logger(
              req,
              res,
              async () =>
                // moved up
                await circuitBreaker(
                  req,
                  res,
                  async () => await proxyRequest(req, res),
                ),
            ),
        ),
    );
  } catch (err) {
    next(err);
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(502).json({
    error: "Bad Gateway",
    message: err.code || err.message || "Downstream service unavailable",
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Gateway running on port ${PORT}`));
