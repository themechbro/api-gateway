const express = require("express");
const router = express.Router();
const pool = require("../core/db");
const { loadRoutes } = require("../core/router");

// Get all routes
router.get("/routes", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM routes ORDER BY created_at DESC",
  );
  res.json(rows);
});

// Add routes
router.post("/routes", async (req, res) => {
  const { path_prefix, target_url, requires_path } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO routes (path_prefix, target_url, requires_auth)
     VALUES ($1, $2, $3) RETURNING *`,
    [path_prefix, target_url, requires_auth ?? true],
  );
  res.status(201).json(rows[0]);
});

// Update route
router.put("/routes/:id", async (req, res) => {
  const { path_prefix, target_url, requires_auth, active } = req.body;
  const { rows } = await pool.query(
    `UPDATE routes SET path_prefix=$1, target_url=$2, requires_auth=$3, active=$4
     WHERE id=$5 RETURNING *`,
    [path_prefix, target_url, requires_auth, active, req.params.id],
  );
  res.json(rows[0]);
});

// Delete route
router.delete("/routes/:id", async (req, res) => {
  await pool.query("DELETE FROM routes WHERE id=$1", [req.params.id]);
  res.json({ message: "Route deleted" });
});

// Get logs
router.get("/logs", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM logs ORDER BY created_at DESC LIMIT 100",
  );
  res.json(rows);
});

// Get circuit breaker states
router.get("/circuit-breakers", async (req, res) => {
  const { rows } = await pool.query("SELECT id, path_prefix FROM routes");
  const redis = require("../middleware/redisClient");

  const states = await Promise.all(
    rows.map(async (route) => ({
      route: route.path_prefix,
      state: (await redis.get(`cb:${route.id}`)) || "CLOSED",
    })),
  );

  res.json(states);
});

module.exports = router;
