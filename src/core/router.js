const pool = require("./db");

let cachedRoutes = [];
let lastLoaded = 0;

async function loadRoutes(req) {
  const now = Date.now();

  if (now - lastLoaded > 30000 || cachedRoutes.length === 0) {
    const { rows } = await pool.query(
      "SELECT * FROM routes WHERE active= true",
    );
    cachedRoutes = rows;
    lastLoaded = now;
  }
  return cachedRoutes.find((route) => req.path.startsWith(route.path_prefix));
}

module.exports = { loadRoutes };
