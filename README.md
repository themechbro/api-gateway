# API Gateway

A production-grade API Gateway built with Node.js featuring JWT authentication, Redis-based rate limiting, and a circuit breaker pattern for distributed fault tolerance.

**Live:** [api-gateway-vv0h.onrender.com](https://api-gateway-vv0h.onrender.com)  
**Dashboard:** [gateway-dashboard.vercel.app](https://gateway-dashboard.vercel.app)

---

## Architecture

```
Client → [API Gateway] → Service A
                       → Service B
                       → Service C
```

Every request passes through a middleware pipeline before reaching any downstream service:

```
Request → Auth → Rate Limiter → Logger → Circuit Breaker → Proxy → Downstream
```

---

## Features

### JWT Authentication

- Validates Bearer tokens on protected routes
- Per-route auth config — public and private routes supported
- Pluggable — swap JWT for API keys without touching other middleware

### Rate Limiting (Redis Lua)

- 100 requests per IP per minute per route
- Atomic Lua script execution on Upstash Redis — no race conditions
- Returns `429` with clean error on threshold breach

### Circuit Breaker

Three-state fault isolation per downstream service:

| State       | Behavior                                    |
| ----------- | ------------------------------------------- |
| `CLOSED`    | Requests pass through normally              |
| `OPEN`      | Requests blocked immediately, returns `503` |
| `HALF-OPEN` | Single test request allowed through         |

Transitions:

- `CLOSED → OPEN` after 5 failures in 10 seconds
- `OPEN → HALF-OPEN` after 30 second cooldown
- `HALF-OPEN → CLOSED` on successful request
- `HALF-OPEN → OPEN` on failed request

Prevents cascade failures across microservices.

### Request Logging

- Every request logged to PostgreSQL with method, path, status, duration, and IP
- Non-blocking — uses `res.on('finish')` to avoid impacting response time

### Dynamic Route Management

- Routes stored in PostgreSQL — no redeployment needed to add/remove routes
- In-memory cache with 30 second TTL for performance
- Full CRUD via admin API

---

## Tech Stack

| Layer           | Technology                           |
| --------------- | ------------------------------------ |
| Gateway         | Node.js, Express                     |
| Rate Limiting   | Upstash Redis, Lua                   |
| Circuit Breaker | Upstash Redis                        |
| Database        | Supabase PostgreSQL                  |
| Dashboard       | Next.js, Tailwind CSS                |
| Deployment      | Render (gateway), Vercel (dashboard) |

---

## Admin API

```
GET    /admin/routes           — list all routes
POST   /admin/routes           — add route
PUT    /admin/routes/:id       — update route
DELETE /admin/routes/:id       — delete route
GET    /admin/logs             — last 100 requests
GET    /admin/circuit-breakers — current breaker states
```

---

## Local Setup

```bash
git clone https://github.com/themechbro/api-gateway
cd api-gateway
npm install
```

Create `.env`:

```env
PORT=8000
JWT_SECRET=your_secret
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://...
```

Create tables in Supabase:

```sql
CREATE TABLE routes (
  id SERIAL PRIMARY KEY,
  path_prefix TEXT NOT NULL UNIQUE,
  target_url TEXT NOT NULL,
  requires_auth BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE logs (
  id SERIAL PRIMARY KEY,
  route_id INT REFERENCES routes(id),
  method TEXT,
  path TEXT,
  status INT,
  duration_ms INT,
  ip TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Start Redis and run:

```bash
npm run dev
```

---

## Key Design Decisions

**Why Redis Lua for rate limiting?**  
`INCR` + `EXPIRE` as separate commands creates a race condition where two requests can both read 0 and both set the key. A Lua script executes atomically on Redis — no race condition possible.

**Why circuit breaker state in Redis and not memory?**  
In-memory state is per-process. On a multi-instance deployment, each instance would have its own counter — circuit would never trip. Redis gives shared state across all instances.

**Why in-memory route cache with TTL?**  
Every request hitting PostgreSQL for route lookup adds ~5-10ms latency. Cache reduces this to ~0ms. 30 second TTL means route changes propagate quickly without sacrificing performance.
