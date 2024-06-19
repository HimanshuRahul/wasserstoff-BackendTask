const express = require("express");
const httpProxy = require("http-proxy");
const axios = require("axios");
const winston = require("winston");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const limiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  limit: 10, // Limit each IP to 10 requests per `window` (here, per 2 minutes).
});

const proxy = httpProxy.createProxyServer({});
const FIRST_SERVER_PORT = 4001;
const SECOND_SERVER_PORT = 4002;

router.use(limiter);

const allServers = [
  { host: `http://localhost:${FIRST_SERVER_PORT}`, isHealthy: true },
  { host: `http://localhost:${SECOND_SERVER_PORT}`, isHealthy: true },
];

const requestQueue = [];
let currentServerIndex = 0;

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "fifoLoadBalancer.log" }),
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

async function processQueue() {
  while (requestQueue.length > 0) {
    const healthyServers = allServers.filter((server) => server.isHealthy);
    if (healthyServers.length === 0) {
      const reqRes = requestQueue.shift();
      const req = reqRes.req;
      const res = reqRes.res;
      res
        .status(502)
        .send("No healthy backends available to handle the request.");
      continue;
    }

    let target;
    do {
      target = healthyServers[currentServerIndex].host;
      currentServerIndex = (currentServerIndex + 1) % healthyServers.length;
    } while (!target);

    const reqRes = requestQueue.shift();
    const req = reqRes.req;
    const res = reqRes.res;

    logger.info(`Proxying request to: ${target}`);
    const start = Date.now();

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
  }
}

router.use((req, res) => {
  requestQueue.push({ req, res });
  processQueue();
});

proxy.on("error", (err, req, res) => {
  logger.error("Proxy error:", err);
  res.status(500).send("Proxy error occurred.");
});

module.exports = router;
