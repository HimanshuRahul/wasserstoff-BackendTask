const express = require("express");
const httpProxy = require("http-proxy");
const axios = require("axios");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = 5000;

const FIRST_SERVER_PORT = 4001;
const SECOND_SERVER_PORT = 4002;

const allServers = [
  { host: `http://localhost:${FIRST_SERVER_PORT}`, isHealthy: true },
  { host: `http://localhost:${SECOND_SERVER_PORT}`, isHealthy: true },
];

let currentServerIndex = 0;

const proxy = httpProxy.createProxyServer({});

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
      console.error("Health check failed", err);
    });
}, 10000);

async function getNextServer(req) {
  const healthyServers = allServers.filter((server) => server.isHealthy);
  if (healthyServers.length === 0) return null;

  // Custom routing based on request headers
  const apiTypeHeader = req.headers["x-api-type"];
  if (apiTypeHeader && apiTypeHeader.toLowerCase() === "rest") {
    const server1 = healthyServers.find((server) =>
      server.host.includes(FIRST_SERVER_PORT)
    );
    if (server1) {
      console.log(
        `Selected server based on header ${apiTypeHeader}: ${server1.host}`
      );
      return server1.host;
    }
  }

  // Default round-robin routing
  let server = healthyServers[currentServerIndex % healthyServers.length];
  currentServerIndex = (currentServerIndex + 1) % healthyServers.length;
  console.log(`Selected server using round-robin: ${server.host}`);
  return server.host;
}

app.use(async (req, res) => {
  console.log(`Received request: ${req.method} ${req.url}`);
  console.log(`Request headers: ${JSON.stringify(req.headers)}`);
  console.log(`Request body: ${JSON.stringify(req.body)}`);

  const target = await getNextServer(req);

  if (target) {
    console.log(`Proxying request to: ${target}`);
    proxy.web(req, res, { target }, (err) => {
      if (err) {
        console.error(`Error proxying request: ${err}`);
        res.status(500).send("Error proxying request");
      }
    });

    proxy.once("proxyRes", (proxyRes) => {
      let body = "";
      proxyRes.on("data", (chunk) => {
        body += chunk;
      });
      proxyRes.on("end", () => {
        console.log(`Response from target server: ${body}`);
      });
    });
  } else {
    console.log("No healthy backends available to handle the request.");
    res
      .status(502)
      .send("No healthy backends available to handle the request.");
  }
});

proxy.on("error", (err, req, res) => {
  console.error("Proxy error:", err);
  res.status(500).send("Proxy error occurred.");
});

app.listen(PORT, () => {
  console.log(`Load balancer started on port ${PORT}`);
});
