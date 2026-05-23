const jwt = require("jsonwebtoken");

async function authMiddleware(req, res, next) {
  if (!req.route.requires_auth) return await next();

  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    console.log("JWT ERROR:", err.message);
    return res.status(401).json({ error: "Invalid token" });
  }

  await next(); // outside try/catch
}

module.exports = authMiddleware;
