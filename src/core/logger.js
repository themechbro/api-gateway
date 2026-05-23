const pool = require("./db");

async function logger(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    pool
      .query(
        `INSERT INTO logs (route_id, method, path, status, duration_ms, ip, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          req.route.id,
          req.method,
          req.path,
          res.statusCode,
          duration,
          req.ip || req.headers["x-forwarded-for"],
        ],
      )
      .catch(console.error);
  });

  await next();
}

module.exports = logger;
