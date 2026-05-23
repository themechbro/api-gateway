const { createProxyMiddleware } = require("http-proxy-middleware");

async function proxyRequest(req, res) {
  const { target_url } = req.route;

  return new Promise((resolve, reject) => {
    const proxy = createProxyMiddleware({
      target: target_url,
      changeOrigin: true,
      on: {
        error: (err) => reject(err),
        proxyRes: () => resolve(),
      },
      headers: {
        "x-forwarded-for":
          req.headers["x-forwarded-for"] || req.ip || req.socket.remoteAddress,
      },
    });

    proxy(req, res, (err) => {
      if (err) reject(err);
    });
  });
}

module.exports = proxyRequest;
