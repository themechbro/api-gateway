const redis = require("./redisClient");

const WINDOW = 60;
const MAX_REQUESTS = 100;

const luaScript = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local current = redis.call("INCR", key)
if current == 1 then
   redis.call("EXPIRE", key, window)
end
if current > limit then
  return 0
end
return 1
`;

async function rateLimiter(req, res, next) {
  const ip = req.ip || req.headers["x-forwarded-for"];
  const key = `rl:${ip}:${req.route.id}`;
  const allowed = await redis.eval(luaScript, 1, key, MAX_REQUESTS, WINDOW);
  if (!allowed) {
    return res.status(429).json({ error: "Too many requests" });
  }
  await next();
}

module.exports = rateLimiter;
