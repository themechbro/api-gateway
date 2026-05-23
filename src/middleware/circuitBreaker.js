const redis = require("./redisClient");

const FAILURE_THRESHOLD = 5;
const COOLDOWN = 30; //seconds
const HALF_OPEN_TTL = 10;

async function circuitBreaker(req, res, next) {
  const key = `cb:${req.route.id}`;
  const state = await redis.get(key);

  if (state === "OPEN") {
    return res.status(503).json({ error: "Service unavailable, circuit open" });
  }

  try {
    await next();

    // Success — reset failures
    await redis.del(`cb:failures:${req.route.id}`);
    if (state === "HALF_OPEN") await redis.del(key);
  } catch (err) {
    const failKey = `cb:failures:${req.route.id}`;
    const failures = await redis.incr(failKey);
    await redis.expire(failKey, 10);

    if (failures >= FAILURE_THRESHOLD) {
      await redis.set(key, "OPEN", "EX", COOLDOWN);
    }

    // After cooldown, Redis TTL expires → next request sets HALF_OPEN
    if (!state) await redis.set(key, "HALF_OPEN", "EX", HALF_OPEN_TTL);

    throw err;
  }
}

module.exports = circuitBreaker;
