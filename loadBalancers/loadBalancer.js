const express = require("express");
const httpProxy = require("http-proxy");
const axios = require("axios");
const winston = require("winston");
const rateLimit = require("express-rate-limit");

const app = express();
const limiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  limit: 10, // Limit each IP to 10 requests per `window` (here, per 2 minutes).
});

const proxy = httpProxy.createProxyServer({});
const PORT = 5000;

const FIRST_SERVER_PORT = 4001;
const SECOND_SERVER_PORT = 4002;

app.use(limiter);

const allServers = [
  { host: `http://localhost:${FIRST_SERVER_PORT}`, isHealthy: true },
  { host: `http://localhost:${SECOND_SERVER_PORT}`, isHealthy: true },
];

let currentServerIndex = 0;

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "loadBalancer.log" }),
  ],
});

async function checkServerHealth(server) {
  try {
    const response = await axios.get(server.host + "/");
    server.isHealthy = response.status === 200;
  } catch (error) {
    server.isHealthy = false;
  }

  if (server.isHealthy) {
    console.log(`Server ${server.host} is healthy`);
  } else {
    console.log(`Server ${server.host} is unhealthy`);
  }
}

async function performHealthChecks() {
  await Promise.all(allServers.map(checkServerHealth));
}

setInterval(() => {
  performHealthChecks()
    .then(() => {
      console.log("Health check performed");
    })
    .catch((err) => {
      logger.error("Health check failed", err);
    });
}, 10000);

async function getNextServer(req) {
  const healthyServers = allServers.filter((server) => server.isHealthy);
  if (healthyServers.length === 0) return null;

  const apiTypeHeader = req.headers["x-api-type"];
  if (apiTypeHeader && apiTypeHeader.toLowerCase() === "rest") {
    const server1 = healthyServers.find((server) =>
      server.host.includes(FIRST_SERVER_PORT)
    );
    if (server1) {
      logger.info(
        `Selected server based on header ${apiTypeHeader}: ${server1.host}`
      );
      return server1.host;
    }
  }

  let server = healthyServers[currentServerIndex % healthyServers.length];
  currentServerIndex = (currentServerIndex + 1) % healthyServers.length;
  logger.info(`Selected server using round-robin: ${server.host}`);
  return server.host;
}

app.use(async (req, res) => {
  const start = Date.now();
  logger.info(`Received request: ${req.method} ${req.url}`, {
    headers: req.headers,
    body: req.body,
  });

  const target = await getNextServer(req);

  if (target) {
    logger.info(`Proxying request to: ${target}`);
    proxy.web(req, res, { target }, (err) => {
      if (err) {
        logger.error(`Error proxying request: ${err}`);
        res.status(500).send("Error proxying request");
      }
    });

    proxy.once("proxyRes", (proxyRes) => {
      let body = "";
      proxyRes.on("data", (chunk) => {
        body += chunk;
      });
      proxyRes.on("end", () => {
        const duration = Date.now() - start;
        logger.info(`Response from target server: ${body}`, {
          duration: `${duration}ms`,
        });
      });
    });
  } else {
    logger.warn("No healthy backends available to handle the request.");
    res
      .status(502)
      .send("No healthy backends available to handle the request.");
  }
});

proxy.on("error", (err, req, res) => {
  logger.error("Proxy error:", err);
  res.status(500).send("Proxy error occurred.");
});

app.listen(PORT, () => {
  logger.info(`Load balancer started on port ${PORT}`);
});
