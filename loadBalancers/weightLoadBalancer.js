const express = require("express");
const httpProxy = require("http-proxy");
const axios = require("axios");
const winston = require("winston");
const rateLimit = require("express-rate-limit");

const app = express();
const proxy = httpProxy.createProxyServer({});

const limiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  limit: 10, // Limit each IP to 10 requests per `window` (here, per 2 minutes).
});

app.use(limiter);

const PORT = 5002;
const FIRST_SERVER_PORT = 4001;
const SECOND_SERVER_PORT = 4002;

const servers = [
  {
    host: `http://localhost:${FIRST_SERVER_PORT}`,
    weight: 1,
    isHealthy: true,
    currentWeight: 0,
  },
  {
    host: `http://localhost:${SECOND_SERVER_PORT}`,
    weight: 1,
    isHealthy: true,
    currentWeight: 0,
  },
];

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "weightLoadBalancer.log" }),
  ],
});

async function checkServerHealth(server) {
  try {
    const response = await axios.get(server.host + "/");
    server.isHealthy = response.status === 200;
  } catch (error) {
    server.isHealthy = false;
  }
  console.log(
    `Server ${server.host} health check: ${
      server.isHealthy ? "Healthy" : "Unhealthy"
    }`
  );
}

async function performHealthChecks() {
  await Promise.all(servers.map(checkServerHealth));
}

setInterval(performHealthChecks, 10000); // Perform health checks every 10 seconds

function getNextServer() {
  let totalWeight = 0;
  let bestServer = null;

  servers.forEach((server) => {
    if (server.isHealthy) {
      server.currentWeight += server.weight;
      totalWeight += server.weight;

      if (!bestServer || server.currentWeight > bestServer.currentWeight) {
        bestServer = server;
      }
    }
  });

  if (bestServer) {
    bestServer.currentWeight -= totalWeight;
    logger.info(
      `Selected server: ${bestServer.host} with current weight: ${bestServer.currentWeight}`
    );
  }

  return bestServer;
}

app.use((req, res) => {
  const targetServer = getNextServer();
  const start = Date.now();

  if (!targetServer) {
    res
      .status(502)
      .send("No healthy backends available to handle the request.");
    return;
  }

  logger.info(`Proxying request to: ${targetServer.host}`);
  proxy.web(req, res, { target: targetServer.host }, (err) => {
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
});

proxy.on("error", (err, req, res) => {
  logger.error("Proxy error:", err);
  res.status(500).send("Proxy error occurred.");
});

app.listen(PORT, () => {
  logger.info(`Weight-based round robin load balancer started on port ${PORT}`);
});
